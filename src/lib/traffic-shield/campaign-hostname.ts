import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

const CAMPAIGN_PREFIXES = ["ads", "c", "track", "go", "clk"];

/** Subdomínio dedicado (ex: ads.radario.sbs) — não mexe no www/@ */
export function isDedicatedCampaignSubdomain(hostname: string): boolean {
  const parts = normalizeHostname(hostname).split(".").filter(Boolean);
  return parts.length >= 3;
}

export function suggestCampaignHostname(baseDomain: string): string {
  const clean = normalizeHostname(baseDomain);
  const parts = clean.split(".").filter(Boolean);
  if (parts.length >= 3) return clean;
  return `ads.${clean}`;
}

export function getCampaignSubdomainLabel(hostname: string): string {
  const parts = normalizeHostname(hostname).split(".").filter(Boolean);
  if (parts.length >= 3) return parts[0];
  return "ads";
}

export function getRootDomainFromHostname(hostname: string): string {
  const parts = normalizeHostname(hostname).split(".").filter(Boolean);
  if (parts.length < 2) return hostname;
  return parts.slice(-2).join(".");
}

export function validateCampaignHostnameInput(hostname: string): {
  ok: boolean;
  message?: string;
  suggested?: string;
} {
  const clean = normalizeHostname(hostname);
  if (!clean.includes(".")) {
    return { ok: false, message: "Informe um domínio completo." };
  }

  if (!isDedicatedCampaignSubdomain(clean)) {
    return {
      ok: false,
      message:
        "Use um subdomínio dedicado para campanhas (ex: ads.radario.sbs). O www e o domínio raiz do site não devem ser alterados.",
      suggested: suggestCampaignHostname(clean),
    };
  }

  const label = getCampaignSubdomainLabel(clean);
  if (!CAMPAIGN_PREFIXES.includes(label) && label.length < 2) {
    return {
      ok: false,
      message: "Use um prefixo claro: ads, c, track ou go.",
    };
  }

  return { ok: true };
}
