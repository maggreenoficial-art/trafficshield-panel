import { NextResponse } from "next/server";
import {
  getTrafficConfig,
  getTrafficStats,
  saveTrafficConfig,
} from "@/lib/db/traffic";
import type { TrafficShieldConfig } from "@/lib/traffic-shield/types";

export async function GET() {
  try {
    const [config, stats] = await Promise.all([
      getTrafficConfig(),
      getTrafficStats(),
    ]);
    return NextResponse.json({ config, stats });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar dados de tráfego." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as Partial<TrafficShieldConfig>;
    const current = await getTrafficConfig();
    const updated = await saveTrafficConfig({ ...current, ...body });
    return NextResponse.json({ config: updated });
  } catch {
    return NextResponse.json(
      { error: "Erro ao salvar configuração." },
      { status: 500 }
    );
  }
}
