import { NextResponse } from "next/server";
import {
  createTrafficDomain,
  getDomainSlotInfo,
  getTrafficDomainsWithStats,
} from "@/lib/db/traffic-campaigns";
import {
  getCnameTarget,
  getDnsInstructions,
} from "@/lib/traffic-shield/dns-instructions";
import { getSiteCampaignDomain } from "@/lib/traffic-shield/site-domain";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const [domains, slots] = await Promise.all([
      getTrafficDomainsWithStats(),
      getDomainSlotInfo(),
    ]);
    return NextResponse.json({
      domains,
      slots,
      siteDomain: getSiteCampaignDomain(origin),
      dns: {
        cnameTarget: getCnameTarget(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao carregar domínios." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.hostname?.trim()) {
      return NextResponse.json({ error: "Domínio obrigatório." }, { status: 400 });
    }
    const domain = await createTrafficDomain({
      hostname: body.hostname,
      label: body.label,
      isPrimary: body.isPrimary,
    });
    const slots = await getDomainSlotInfo();
    const dnsInstructions = getDnsInstructions(domain.hostname);
    return NextResponse.json({ domain, slots, dnsInstructions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao cadastrar domínio.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
