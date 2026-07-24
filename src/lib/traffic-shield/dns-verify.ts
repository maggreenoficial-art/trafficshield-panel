import { promises as dns } from "dns";
import { getCnameRecordName, getCnameTarget } from "@/lib/traffic-shield/dns-instructions";
import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

function normalizeDnsHost(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

export async function checkCnamePointsToTarget(
  hostname: string
): Promise<{ ok: boolean; found?: string; lookupHost: string }> {
  const clean = normalizeHostname(hostname);
  const target = normalizeDnsHost(getCnameTarget());
  const recordName = getCnameRecordName(clean);
  const lookupHost =
    recordName === "www" && !clean.startsWith("www.")
      ? `www.${clean}`
      : clean;

  try {
    const cnames = await dns.resolveCname(lookupHost);
    const match = cnames.find(
      (c) =>
        normalizeDnsHost(c) === target ||
        normalizeDnsHost(c).endsWith(`.${target}`)
    );
    return {
      ok: Boolean(match),
      found: cnames[0],
      lookupHost,
    };
  } catch {
    return { ok: false, lookupHost };
  }
}

export async function validateDomainDns(
  hostname: string
): Promise<{ status: "valid" | "invalid" | "pending"; message: string }> {
  const clean = normalizeHostname(hostname);
  const instructions = getCnameTarget();
  const cnameCheck = await checkCnamePointsToTarget(clean);

  if (cnameCheck.ok) {
    return {
      status: "valid",
      message: `CNAME configurado corretamente → ${instructions}`,
    };
  }

  const recordName = getCnameRecordName(clean);
  return {
    status: "pending",
    message: `Crie o CNAME: ${recordName} → ${instructions}. DNS pode levar até 48h para propagar.`,
  };
}
