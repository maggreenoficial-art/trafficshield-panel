import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import {
  createBlock,
  getBlockById,
  getStoryboard,
  touchStoryboard,
  updateBlock,
} from "@/lib/db/storyboards";
import {
  buildKieInput,
  createKieTask,
  getKieAccountCredits,
} from "@/lib/kie/client";
import {
  estimateKieCredits,
  getStoryboardModel,
} from "@/lib/kie/models";
import { getSiteUrl } from "@/lib/site-config";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const panel = await requirePanelContext(request);
  if (panel instanceof NextResponse) return panel;
  const { id: storyboardId } = await context.params;

  try {
    const board = await getStoryboard(panel.tenantId, storyboardId);
    if (!board) {
      return NextResponse.json(
        { error: "Storyboard não encontrado." },
        { status: 404 }
      );
    }

    const body = (await request.json()) as {
      blockId?: string;
      modelKey?: string;
      prompt?: string;
      aspectRatio?: string;
      resolution?: string;
      referenceUrls?: string[];
      positionX?: number;
      positionY?: number;
      sourceBlockId?: string | null;
    };

    const model = getStoryboardModel(body.modelKey ?? "");
    if (!model) {
      return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
    }

    const prompt = body.prompt?.trim() ?? "";
    const modelNeedsPrompt = model.kind === "image";
    if (modelNeedsPrompt && !prompt) {
      return NextResponse.json({ error: "Prompt obrigatório." }, { status: 400 });
    }

    let referenceUrls = (body.referenceUrls ?? []).filter(Boolean);
    const sourceBlockId = body.sourceBlockId ?? null;

    if (sourceBlockId) {
      const source = await getBlockById(panel.tenantId, sourceBlockId);
      if (source?.resultUrl && !referenceUrls.includes(source.resultUrl)) {
        referenceUrls = [source.resultUrl, ...referenceUrls];
      }
    }

    if (model.requiresReference && referenceUrls.length === 0) {
      return NextResponse.json(
        {
          error:
            "Conecte uma imagem de referência (plug de outra cena ou upload).",
        },
        { status: 400 }
      );
    }

    if (model.requiresMotionVideo) {
      const hasVideo = referenceUrls.some((u) =>
        /\.(mp4|mov|webm)(\?|$)/i.test(u)
      );
      if (!hasVideo) {
        return NextResponse.json(
          {
            error:
              "Imitar movimento precisa de um vídeo de referência (upload .mp4).",
          },
          { status: 400 }
        );
      }
    }

    const resolution = body.resolution || model.defaultResolution || "1K";
    const aspectRatio = body.aspectRatio || "auto";
    const cost = estimateKieCredits(model.key, resolution);

    let kieCredits = 0;
    try {
      kieCredits = await getKieAccountCredits();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível ler créditos Kie.";
      return NextResponse.json({ error: message }, { status: 502 });
    }

    if (kieCredits < cost) {
      return NextResponse.json(
        {
          error: `Créditos Kie insuficientes. Precisa de ${cost}, tem ${kieCredits}.`,
          credits: kieCredits,
        },
        { status: 402 }
      );
    }

    let block =
      body.blockId
        ? await getBlockById(panel.tenantId, body.blockId)
        : null;

    if (body.blockId && !block) {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }

    if (block) {
      block = await updateBlock(panel.tenantId, block.id, {
        modelKey: model.key,
        prompt,
        aspectRatio,
        resolution,
        referenceUrls,
        status: "queued",
        creditsCharged: cost,
        kieModel: model.kieModel,
        sourceBlockId: sourceBlockId ?? block.sourceBlockId,
        errorMessage: null,
      });
    } else {
      block = await createBlock(panel.tenantId, {
        storyboardId,
        modelKey: model.key,
        prompt,
        aspectRatio,
        resolution,
        referenceUrls,
        positionX: body.positionX ?? 160 + Math.random() * 80,
        positionY: body.positionY ?? 140 + Math.random() * 80,
        status: "queued",
        creditsCharged: cost,
        kieModel: model.kieModel,
        sourceBlockId,
      });
    }

    const siteUrl =
      getSiteUrl() ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      new URL(request.url).origin;
    const callbackSecret =
      process.env.KIE_CALLBACK_SECRET?.trim() ||
      process.env.TRAFFIC_INTERNAL_SECRET?.trim() ||
      "";
    const callBackUrl = callbackSecret
      ? `${siteUrl.replace(/\/$/, "")}/api/kie/callback?token=${encodeURIComponent(callbackSecret)}`
      : undefined;

    let kieModel = model.kieModel;
    if (
      model.kind === "image" &&
      referenceUrls.length > 0 &&
      kieModel === "gpt-image-2-text-to-image"
    ) {
      kieModel = "gpt-image-2-image-to-image";
    }

    try {
      const input = buildKieInput({
        modelKey: model.key,
        kieModel,
        prompt,
        aspectRatio,
        resolution,
        referenceUrls,
      });

      const { taskId } = await createKieTask({
        model: kieModel,
        callBackUrl,
        input,
      });

      const updated = await updateBlock(panel.tenantId, block.id, {
        status: "generating",
        kieTaskId: taskId,
        kieModel,
      });
      await touchStoryboard(panel.tenantId, storyboardId);

      const credits = await getKieAccountCredits().catch(() => kieCredits - cost);
      return NextResponse.json({ block: updated, credits, cost });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao criar tarefa na Kie AI.";
      await updateBlock(panel.tenantId, block.id, {
        status: "fail",
        errorMessage: message,
      });
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch {
    return NextResponse.json(
      { error: "Erro ao iniciar geração." },
      { status: 500 }
    );
  }
}
