import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  createBlock,
  getBlockById,
  getStoryboard,
  touchStoryboard,
  type StoryboardBlock,
} from "@/lib/db/storyboards";
import { getStoryboardModel, estimateKieCredits } from "@/lib/kie/models";

type Ctx = { params: Promise<{ id: string }> };

function isVideoUrl(url: string) {
  return /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

/** Sobe a cadeia até achar uma imagem usável como referência (avatar / take). */
async function resolveImageRefsFromSource(
  tenantId: string,
  source: StoryboardBlock
): Promise<string[]> {
  const fromRefs = source.referenceUrls.filter((u) => u && !isVideoUrl(u));
  if (fromRefs.length) return fromRefs;

  if (source.resultUrl && !isVideoUrl(source.resultUrl)) {
    return [source.resultUrl];
  }

  let current: StoryboardBlock | null = source;
  for (let i = 0; i < 8 && current?.sourceBlockId; i++) {
    const parent = await getBlockById(tenantId, current.sourceBlockId);
    if (!parent) break;
    if (parent.resultUrl && !isVideoUrl(parent.resultUrl)) {
      return [parent.resultUrl];
    }
    const parentRefs = parent.referenceUrls.filter((u) => u && !isVideoUrl(u));
    if (parentRefs.length) return parentRefs;
    current = parent;
  }

  return [];
}

/** Cria bloco draft no canvas (plug-and-play). */
export async function POST(request: NextRequest, context: Ctx) {
  const panel = await requirePlatformAdmin(request);
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
      referenceUrls = await resolveImageRefsFromSource(panel.tenantId, source);
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
