import { NextResponse, type NextRequest } from "next/server";
import {
  deleteTrafficDomain,
  getTrafficDomainsWithStats,
  setPrimaryDomain,
  updateTrafficDomainValidation,
} from "@/lib/db/traffic-campaigns";
import { getDnsInstructions } from "@/lib/traffic-shield/dns-instructions";
import { validateDomainHostname } from "@/lib/traffic-shield/domain-validation";
import { requirePanelContext } from "@/lib/api/panel-context";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const domains = await getTrafficDomainsWithStats(ctx.tenantId);
    const domain = domains.find((d) => d.id === id);
    if (!domain) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    return NextResponse.json({
      domain,
      dnsInstructions: getDnsInstructions(domain.hostname),
    });
  } catch {
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const body = await request.json();
    const action = body.action as string;

    if (action === "validate") {
      const domains = await getTrafficDomainsWithStats(ctx.tenantId);
      const existing = domains.find((d) => d.id === id);
      if (!existing) {
        return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
      }
      const validation = await validateDomainHostname(existing.hostname);
      const domain = await updateTrafficDomainValidation(
        ctx.tenantId,
        id,
        validation
      );
      return NextResponse.json({ domain });
    }

    if (action === "set_primary") {
      await setPrimaryDomain(ctx.tenantId, id);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    await deleteTrafficDomain(ctx.tenantId, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir domínio." }, { status: 500 });
  }
}
