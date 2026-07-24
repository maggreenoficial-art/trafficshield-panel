import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

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
