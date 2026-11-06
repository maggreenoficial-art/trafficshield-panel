import { NextResponse, type NextRequest } from "next/server";
import { getSiteVisitStats } from "@/lib/db/site-visits";
import {
  getTrafficConfig,
  getTrafficStats,
  saveTrafficConfig,
} from "@/lib/db/traffic";
import { requirePanelContext } from "@/lib/api/panel-context";
import type { TrafficShieldConfig } from "@/lib/traffic-shield/types";

export async function GET(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const [config, stats, siteVisits] = await Promise.all([
      getTrafficConfig(ctx.tenantId),
      getTrafficStats(ctx.tenantId),
      getSiteVisitStats(),
    ]);
    return NextResponse.json({ config, stats, siteVisits, tenant: ctx.tenant });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar dados de tráfego." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as Partial<TrafficShieldConfig>;
    const current = await getTrafficConfig(ctx.tenantId);
    const updated = await saveTrafficConfig(ctx.tenantId, {
      ...current,
      ...body,
    });
    return NextResponse.json({ config: updated });
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar configuração." },
      { status: 500 }
    );
  }
}
