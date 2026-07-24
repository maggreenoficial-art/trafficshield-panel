import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";
import { validateDomainDns } from "@/lib/traffic-shield/dns-verify";

const HOSTNAME_RE =
  /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;

/** Validação estrita: só marca válido se o CNAME apontar para o edge norat. */
export async function validateDomainHostname(
  hostname: string
): Promise<{ status: "valid" | "invalid" | "pending"; message: string }> {
  const clean = normalizeHostname(hostname);

  if (!HOSTNAME_RE.test(clean)) {
    return { status: "invalid", message: "Formato de domínio inválido." };
  }

  return validateDomainDns(clean);
}
