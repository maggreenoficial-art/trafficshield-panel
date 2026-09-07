import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { creditCredits, getTenantCredits } from "@/lib/db/credits";

export async function GET(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;
  const balance = await getTenantCredits(ctx.tenantId);
  return NextResponse.json({ credits: balance });
}

/** Crédito manual só para admin de plataforma (teste). */
export async function POST(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  if (!ctx.isPlatformAdmin) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as { amount?: number };
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      return NextResponse.json({ error: "Valor inválido." }, { status: 400 });
    }
    const credits = await creditCredits({
      tenantId: ctx.tenantId,
      amount: Math.floor(amount),
      reason: "admin_grant",
    });
    return NextResponse.json({ credits });
  } catch {
    return NextResponse.json({ error: "Erro ao creditar." }, { status: 500 });
  }
}
