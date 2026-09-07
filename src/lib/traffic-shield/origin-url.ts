import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

const BLOCKED_HOST_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
];

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata",
  "kubernetes.default",
  "kubernetes.default.svc",
]);

function isIpv4(host: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(host);
}

function isPrivateOrLocalIpv4(host: string): boolean {
  if (!isIpv4(host)) return false;
  const parts = host.split(".").map(Number);
  if (parts.some((n) => Number.isNaN(n) || n > 255)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isIpv6Literal(host: string): boolean {
  return host.includes(":");
}

function isPrivateOrLocalIpv6(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "::1" || h === "::") return true;
  if (h.startsWith("fc") || h.startsWith("fd")) return true; // ULA
  if (h.startsWith("fe80")) return true; // link-local
  return false;
}

/** Bloqueia localhost, IPs privados e hosts de metadata (anti-SSRF). */
export function assertPublicOriginHostname(hostname: string): void {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];

  if (!host) {
    throw new Error("Hostname de origem inválido.");
  }

  if (BLOCKED_HOSTNAMES.has(host)) {
    throw new Error("Origem não permitida (host local/interno).");
  }

  if (BLOCKED_HOST_SUFFIXES.some((s) => host.endsWith(s))) {
    throw new Error("Origem não permitida (domínio interno).");
  }

  if (isIpv4(host) && isPrivateOrLocalIpv4(host)) {
    throw new Error("Origem não pode ser IP privado ou loopback.");
  }

  if (isIpv6Literal(host) && isPrivateOrLocalIpv6(host)) {
    throw new Error("Origem não pode ser IPv6 privado ou loopback.");
  }
}

export function normalizeOriginUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Informe a URL de origem do site.");
  }

  const withProto = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withProto);
  } catch {
    throw new Error("URL de origem inválida.");
  }

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("A origem deve usar HTTP ou HTTPS.");
  }

  if (url.username || url.password) {
    throw new Error("URL de origem não pode conter usuário/senha.");
  }

  assertPublicOriginHostname(url.hostname);

  return url.origin;
}

export function hostsMatchDomain(
  registeredHostname: string,
  requestHost: string
): boolean {
  const registered = normalizeHostname(registeredHostname);
  const request = normalizeHostname(requestHost);
  return registered === request;
}
