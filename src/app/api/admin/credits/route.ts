import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { getKieAccountCredits } from "@/lib/kie/client";
import {
  estimateKieCredits,
  STORYBOARD_MODELS,
  formatKieCredits,
} from "@/lib/kie/models";

export async function GET(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const credits = await getKieAccountCredits();
    const costs = Object.fromEntries(
      STORYBOARD_MODELS.map((m) => [
        m.key,
        estimateKieCredits(m.key, {
          resolution: m.defaultResolution || "1K",
          duration: m.defaultDuration,
        }),
      ])
    );
    return NextResponse.json({
      credits,
      creditsLabel: formatKieCredits(credits),
      source: "kie",
      costs,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Erro ao consultar créditos Kie.";
    return NextResponse.json({ error: message, credits: 0 }, { status: 502 });
  }
}
