import { NextResponse, type NextRequest } from "next/server";
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
import { getErrorMessage } from "@/lib/errors";
import { requirePanelContext } from "@/lib/api/panel-context";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const origin = new URL(request.url).origin;
    const [domains, slots] = await Promise.all([
      getTrafficDomainsWithStats(ctx.tenantId),
      getDomainSlotInfo(ctx.tenantId),
    ]);
    return NextResponse.json({
      domains,
      slots,
      tenant: ctx.tenant,
      siteDomain: getSiteCampaignDomain(origin),
      dns: {
        cnameTarget: getCnameTarget(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao carregar domínios." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = await request.json();
    if (!body.hostname?.trim()) {
      return NextResponse.json({ error: "Domínio obrigatório." }, { status: 400 });
    }
    const domain = await createTrafficDomain(ctx.tenantId, {
      hostname: body.hostname,
      label: body.label,
      isPrimary: body.isPrimary,
      originUrl: body.originUrl,
    });
    const slots = await getDomainSlotInfo(ctx.tenantId);
    const dnsInstructions = getDnsInstructions(domain.hostname);
    return NextResponse.json({ domain, slots, dnsInstructions });
  } catch (err) {
    const msg = getErrorMessage(err, "Erro ao cadastrar domínio.");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
