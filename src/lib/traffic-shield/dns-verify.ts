import { promises as dns } from "dns";
import { getCnameRecordName, getCnameTarget } from "@/lib/traffic-shield/dns-instructions";
import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

function normalizeDnsHost(value: string): string {
  return value.toLowerCase().replace(/\.$/, "");
}

function cnameMatchesTarget(found: string, target: string): boolean {
  const f = normalizeDnsHost(found);
  const t = normalizeDnsHost(target);
  return f === t || f.endsWith(`.${t}`) || t.endsWith(`.${f}`);
}

export async function checkCnamePointsToTarget(
  hostname: string
): Promise<{ ok: boolean; found?: string; lookupHost: string }> {
  const clean = normalizeHostname(hostname);
  const target = normalizeDnsHost(getCnameTarget());
  const recordName = getCnameRecordName(clean);
  const lookupHost =
    recordName === "www" && !clean.includes("www.")
      ? `www.${clean}`
      : clean;

  try {
    const cnames = await dns.resolveCname(lookupHost);
    const match = cnames.find((c) => cnameMatchesTarget(c, target));
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
  const recordName = getCnameRecordName(clean);

  if (cnameCheck.ok) {
    return {
      status: "valid",
      message: `CNAME ${recordName} → ${instructions} verificado.`,
    };
  }

  if (cnameCheck.found) {
    return {
      status: "pending",
      message: `CNAME de ${cnameCheck.lookupHost} aponta para "${cnameCheck.found}", mas deve apontar para ${instructions}.`,
    };
  }

  return {
    status: "pending",
    message: `Crie o CNAME: ${recordName} → ${instructions}. O www e o domínio raiz do site não precisam mudar.`,
  };
}
