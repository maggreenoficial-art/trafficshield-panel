import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

/** Domínio canônico do painel norat em produção. */
export const DEFAULT_SITE_URL = "https://www.norat.cloud";

/** Destino CNAME que clientes usam nos subdomínios de campanha. */
export const DEFAULT_CNAME_TARGET = "www.norat.cloud";

/** Hostnames do painel (sem depender só de env em runtime). */
export const PANEL_HOSTNAMES = ["norat.cloud", "www.norat.cloud"];

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return DEFAULT_SITE_URL;
  return raw.startsWith("http") ? raw : `https://${raw}`;
}

export function getSiteHostname(): string {
  try {
    return normalizeHostname(new URL(getSiteUrl()).hostname);
  } catch {
    return normalizeHostname(DEFAULT_CNAME_TARGET);
  }
}

export function isKnownPanelHostname(hostname: string): boolean {
  const host = normalizeHostname(hostname);
  if (PANEL_HOSTNAMES.some((h) => normalizeHostname(h) === host)) return true;
  return host === getSiteHostname();
}

/** Destino CNAME exposto no client (build-time). */
export function getPublicCnameTarget(): string {
  return (
    process.env.NEXT_PUBLIC_TRAFFIC_DNS_CNAME_TARGET?.trim() ||
    DEFAULT_CNAME_TARGET
  );
}
