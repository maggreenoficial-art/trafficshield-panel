import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { debitCredits, getTenantCredits } from "@/lib/db/credits";
import {
  createBlock,
  getStoryboard,
  touchStoryboard,
  updateBlock,
} from "@/lib/db/storyboards";
import {
  buildKieInput,
  createKieTask,
} from "@/lib/kie/client";
import { getStoryboardModel } from "@/lib/kie/models";
import { getSiteUrl } from "@/lib/site-config";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const panel = await requirePanelContext(request);
  if (panel instanceof NextResponse) return panel;
  const { id: storyboardId } = await context.params;

  try {
    const board = await getStoryboard(panel.tenantId, storyboardId);
    if (!board) {
      return NextResponse.json({ error: "Storyboard não encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      modelKey?: string;
      prompt?: string;
      aspectRatio?: string;
      resolution?: string;
      referenceUrls?: string[];
      positionX?: number;
      positionY?: number;
    };

    const model = getStoryboardModel(body.modelKey ?? "");
    if (!model) {
      return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
    }

    const prompt = body.prompt?.trim() ?? "";
    if (!prompt) {
      return NextResponse.json({ error: "Prompt obrigatório." }, { status: 400 });
    }

    const referenceUrls = (body.referenceUrls ?? []).filter(Boolean);
    if (model.requiresReference && referenceUrls.length === 0) {
      return NextResponse.json(
        { error: "Este modelo precisa de ao menos 1 imagem de referência (URL pública)." },
        { status: 400 }
      );
    }

    const resolution =
      body.resolution || model.defaultResolution || "1K";
    const aspectRatio = body.aspectRatio || "auto";

    const balance = await getTenantCredits(panel.tenantId);
    if (balance < model.credits) {
      return NextResponse.json(
        {
          error: `Créditos insuficientes. Precisa de ${model.credits}, tem ${balance}.`,
        },
        { status: 402 }
      );
    }

    const block = await createBlock(panel.tenantId, {
      storyboardId,
      modelKey: model.key,
      prompt,
      aspectRatio,
      resolution,
      referenceUrls,
      positionX: body.positionX ?? 160 + Math.random() * 80,
      positionY: body.positionY ?? 140 + Math.random() * 80,
      status: "queued",
      creditsCharged: model.credits,
      kieModel: model.kieModel,
    });

    const ok = await debitCredits({
      tenantId: panel.tenantId,
      amount: model.credits,
      reason: `gerar_${model.key}`,
      refType: "storyboard_block",
      refId: block.id,
    });

    if (!ok) {
      await updateBlock(panel.tenantId, block.id, {
        status: "fail",
        errorMessage: "Créditos insuficientes.",
      });
      return NextResponse.json(
        { error: "Créditos insuficientes." },
        { status: 402 }
      );
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

    // Se há referências e o modelo de imagem permite, usa image-to-image
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
      });
      await touchStoryboard(panel.tenantId, storyboardId);

      const credits = await getTenantCredits(panel.tenantId);
      return NextResponse.json({ block: updated, credits });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Falha ao criar tarefa na Kie AI.";
      await updateBlock(panel.tenantId, block.id, {
        status: "fail",
        errorMessage: message,
      });
      // reembolso
      const { creditCredits } = await import("@/lib/db/credits");
      await creditCredits({
        tenantId: panel.tenantId,
        amount: model.credits,
        reason: "reembolso_falha_kie",
        refType: "storyboard_block",
        refId: block.id,
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
