import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

export interface SiteCampaignDomain {
  hostname: string;
  label: string;
}

function hostnameFromEnvValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return normalizeHostname(new URL(url).hostname);
  } catch {
    const host = normalizeHostname(trimmed);
    return host || null;
  }
}

/** Domínio fixo do e-commerce (hospedagem atual), sem validação CNAME TWR. */
export function getSiteCampaignHostname(origin?: string): string | null {
  for (const raw of [
    process.env.TRAFFIC_SITE_DOMAIN,
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_META_EVENT_SOURCE_URL,
  ]) {
    if (!raw?.trim()) continue;
    const host = hostnameFromEnvValue(raw);
    if (host) return host;
  }

  if (origin) {
    try {
      return normalizeHostname(new URL(origin).hostname);
    } catch {
      return null;
    }
  }

  return null;
}

export function getSiteCampaignDomain(
  origin?: string
): SiteCampaignDomain | null {
  const hostname = getSiteCampaignHostname(origin);
  if (!hostname) return null;
  return {
    hostname,
    label: "Domínio da loja (hospedagem atual)",
  };
}

export function enrichCampaignHostname(
  campaign: { domainId: string | null; domainHostname?: string },
  origin?: string
): string | undefined {
  if (campaign.domainHostname) return campaign.domainHostname;
  if (campaign.domainId) return campaign.domainHostname;
  return getSiteCampaignHostname(origin) ?? undefined;
}
