import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getStoryboard } from "@/lib/db/storyboards";
import { chatGrok46 } from "@/lib/kie/grok-chat";
import {
  buildAutoVideoPrompt,
  parseAutoVideoPlan,
} from "@/lib/storyboard/auto-video";

type Ctx = { params: Promise<{ id: string }> };

/** Escreve a imagem 4K e os dois takes de 8s a partir do pedido. */
export async function POST(request: NextRequest, context: Ctx) {
  const panel = await requirePlatformAdmin(request);
  if (panel instanceof NextResponse) return panel;
  const { id: storyboardId } = await context.params;

  try {
    const board = await getStoryboard(panel.tenantId, storyboardId);
    if (!board) {
      return NextResponse.json({ error: "Storyboard não encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      brief?: string;
      baseImageUrl?: string | null;
    };
    const brief = body.brief?.trim() ?? "";
    if (!brief) {
      return NextResponse.json({ error: "Descreva o vídeo." }, { status: 400 });
    }

    const base = body.baseImageUrl?.trim() || "";
    const raw = await chatGrok46(
      buildAutoVideoPrompt(brief),
      base.startsWith("https://") ? [base] : [],
      { reasoning: "low" }
    );
    const plan = parseAutoVideoPlan(raw);
    return NextResponse.json({ plan });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Não foi possível escrever os prompts.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
