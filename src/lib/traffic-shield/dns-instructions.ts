export interface DnsRecordInstruction {
  type: "CNAME";
  name: string;
  target: string;
  ttl: string;
  hostname: string;
}

export function getCnameTarget(): string {
  return (
    process.env.TRAFFIC_DNS_CNAME_TARGET?.trim() ||
    process.env.NEXT_PUBLIC_TRAFFIC_DNS_CNAME_TARGET?.trim() ||
    "cname.vercel-dns.com"
  );
}

/** Extrai o subdomínio para o registro CNAME (ex: www.rabbitdomain.com → www) */
export function getCnameRecordName(hostname: string): string {
  const clean = hostname
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  const parts = clean.split(".").filter(Boolean);
  if (parts.length <= 2) return "www";
  return parts[0];
}

export function getDnsInstructions(hostname: string): DnsRecordInstruction {
  const clean = hostname
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "");

  return {
    type: "CNAME",
    name: getCnameRecordName(clean),
    target: getCnameTarget(),
    ttl: "14400 (padrão)",
    hostname: clean,
  };
}
