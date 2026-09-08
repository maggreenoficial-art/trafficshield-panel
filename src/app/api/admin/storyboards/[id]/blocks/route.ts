import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import {
  createBlock,
  getBlockById,
  getStoryboard,
  touchStoryboard,
} from "@/lib/db/storyboards";
import { getStoryboardModel, estimateKieCredits } from "@/lib/kie/models";

type Ctx = { params: Promise<{ id: string }> };

/** Cria bloco draft no canvas (plug-and-play). */
export async function POST(request: NextRequest, context: Ctx) {
  const panel = await requirePanelContext(request);
  if (panel instanceof NextResponse) return panel;
  const { id: storyboardId } = await context.params;

  try {
    const board = await getStoryboard(panel.tenantId, storyboardId);
    if (!board) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      modelKey?: string;
      positionX?: number;
      positionY?: number;
      sourceBlockId?: string | null;
      prompt?: string;
    };

    const model = getStoryboardModel(body.modelKey ?? "image");
    if (!model) {
      return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
    }

    let referenceUrls: string[] = [];
    let sourceBlockId: string | null = body.sourceBlockId ?? null;

    if (sourceBlockId) {
      const source = await getBlockById(panel.tenantId, sourceBlockId);
      if (!source || source.storyboardId !== storyboardId) {
        return NextResponse.json(
          { error: "Bloco de origem inválido." },
          { status: 400 }
        );
      }
      if (source.resultUrl) {
        referenceUrls = [source.resultUrl];
      }
    }

    const offset = 40 + Math.floor(Math.random() * 40);
    const block = await createBlock(panel.tenantId, {
      storyboardId,
      modelKey: model.key,
      prompt: body.prompt ?? "",
      aspectRatio: "auto",
      resolution: model.defaultResolution || "1K",
      referenceUrls,
      positionX: body.positionX ?? 140 + offset,
      positionY: body.positionY ?? 120 + offset,
      status: "draft",
      creditsCharged: estimateKieCredits(model.key, {
        resolution: model.defaultResolution || "1K",
        duration: model.defaultDuration,
      }),
      kieModel: model.kieModel,
      sourceBlockId,
    });

    await touchStoryboard(panel.tenantId, storyboardId);
    return NextResponse.json({ block });
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar bloco." },
      { status: 500 }
    );
  }
}
