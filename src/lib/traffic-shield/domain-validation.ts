import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";
import { validateDomainDns } from "@/lib/traffic-shield/dns-verify";

const HOSTNAME_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

export async function validateDomainHostname(
  hostname: string
): Promise<{ status: "valid" | "invalid" | "pending"; message: string }> {
  const clean = normalizeHostname(hostname);

  if (!HOSTNAME_RE.test(clean)) {
    return { status: "invalid", message: "Formato de domínio inválido." };
  }

  const dnsResult = await validateDomainDns(clean);
  if (dnsResult.status === "valid") {
    return dnsResult;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(`https://${clean}`, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });
    clearTimeout(timer);

    if (res.ok || res.status === 405 || res.status === 403) {
      return {
        status: "valid",
        message: "Domínio acessível e pronto para campanhas.",
      };
    }
  } catch {
    // fallback to DNS pending message
  }

  return dnsResult;
}
