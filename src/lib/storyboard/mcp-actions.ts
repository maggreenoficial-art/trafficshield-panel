import {
  createBlock,
  createStoryboard,
  getBlockById,
  getStoryboard,
  listBlocks,
  listStoryboards,
  touchStoryboard,
  updateBlock,
  type StoryboardBlock,
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
import { COMPLETE_VIDEO } from "@/lib/storyboard/auto-video";
import { syncBlockById } from "@/lib/kie/sync-block";

const BLOCK_W = 300;

export async function mcpListStoryboards(tenantId: string) {
  const [storyboards, credits] = await Promise.all([
    listStoryboards(tenantId),
    getKieAccountCredits().catch(() => 0),
  ]);
  return { storyboards, credits };
}

export async function mcpGetStoryboard(tenantId: string, storyboardId: string) {
  const board = await getStoryboard(tenantId, storyboardId);
  if (!board) return null;
  const [blocks, credits] = await Promise.all([
    listBlocks(tenantId, storyboardId),
    getKieAccountCredits().catch(() => 0),
  ]);
  return { storyboard: board, blocks, credits };
}

export async function mcpCreateStoryboard(
  tenantId: string,
  input: { name: string; description?: string }
) {
  return createStoryboard(tenantId, {
    name: input.name.trim().slice(0, 120),
    description: input.description?.trim().slice(0, 280),
  });
}

export async function mcpCreateTakePipeline(
  tenantId: string,
  input: {
    storyboardId: string;
    imagePrompt: string;
    take1Prompt: string;
    take2Prompt: string;
    baseImageUrl?: string | null;
    aspectRatio?: string;
    startImage?: boolean;
  }
) {
  const board = await getStoryboard(tenantId, input.storyboardId);
  if (!board) throw new Error("Storyboard não encontrado.");

  const existing = await listBlocks(tenantId, input.storyboardId);
  const maxX = existing.reduce((max, b) => Math.max(max, b.positionX), 0);
  const originX = existing.length ? maxX + BLOCK_W + 80 : 140;
  const originY = 80;
  const aspect = input.aspectRatio || "9:16";
  const refs = input.baseImageUrl?.trim()
    ? [input.baseImageUrl.trim()]
    : [];

  const image = await createBlock(tenantId, {
    storyboardId: input.storyboardId,
    modelKey: "image",
    prompt: input.imagePrompt.trim(),
    aspectRatio: aspect,
    resolution: COMPLETE_VIDEO.imageResolution,
    referenceUrls: refs,
    positionX: originX,
    positionY: originY,
    status: "draft",
    creditsCharged: estimateKieCredits("image", COMPLETE_VIDEO.imageResolution),
    kieModel: getStoryboardModel("image")?.kieModel,
  });

  const take1 = await createBlock(tenantId, {
    storyboardId: input.storyboardId,
    modelKey: "grok_15",
    prompt: input.take1Prompt.trim(),
    aspectRatio: aspect,
    resolution: COMPLETE_VIDEO.videoResolution,
    referenceUrls: [],
    positionX: originX + BLOCK_W + 80,
    positionY: originY,
    status: "draft",
    sourceBlockId: image.id,
    creditsCharged: estimateKieCredits("grok_15", {
      resolution: COMPLETE_VIDEO.videoResolution,
      duration: COMPLETE_VIDEO.takeSeconds,
    }),
    kieModel: getStoryboardModel("grok_15")?.kieModel,
  });

  const take2 = await createBlock(tenantId, {
    storyboardId: input.storyboardId,
    modelKey: "grok_15",
    prompt: input.take2Prompt.trim(),
    aspectRatio: aspect,
    resolution: COMPLETE_VIDEO.videoResolution,
    referenceUrls: [],
    positionX: originX + BLOCK_W + 80,
    positionY: originY + 560,
    status: "draft",
    sourceBlockId: image.id,
    creditsCharged: estimateKieCredits("grok_15", {
      resolution: COMPLETE_VIDEO.videoResolution,
      duration: COMPLETE_VIDEO.takeSeconds,
    }),
    kieModel: getStoryboardModel("grok_15")?.kieModel,
  });

  await touchStoryboard(tenantId, input.storyboardId);

  let startedImage: StoryboardBlock | null = null;
  if (input.startImage !== false) {
    startedImage = await mcpStartGeneration(tenantId, {
      storyboardId: input.storyboardId,
      blockId: image.id,
    });
  }

  return {
    image: startedImage ?? image,
    take1,
    take2,
    note:
      "Gere a imagem primeiro. Quando status=success, chame generate_block nos dois takes (eles usam a imagem como primeiro quadro).",
  };
}

export async function mcpStartGeneration(
  tenantId: string,
  input: {
    storyboardId: string;
    blockId: string;
    prompt?: string;
    referenceUrls?: string[];
    duration?: number;
  }
) {
  const board = await getStoryboard(tenantId, input.storyboardId);
  if (!board) throw new Error("Storyboard não encontrado.");

  let block = await getBlockById(tenantId, input.blockId);
  if (!block || block.storyboardId !== input.storyboardId) {
    throw new Error("Bloco não encontrado.");
  }

  const model = getStoryboardModel(block.modelKey);
  if (!model) throw new Error("Modelo inválido.");

  const prompt = (input.prompt ?? block.prompt).trim();
  if (model.kind === "image" && !prompt) {
    throw new Error("Prompt obrigatório para imagem.");
  }

  let referenceUrls = (input.referenceUrls ?? block.referenceUrls).filter(Boolean);
  const plugId = block.sourceBlockId;
  if (plugId) {
    const source = await getBlockById(tenantId, plugId);
    if (source?.resultUrl && !referenceUrls.includes(source.resultUrl)) {
      referenceUrls = [source.resultUrl, ...referenceUrls];
    }
  }

  if (model.requiresReference && referenceUrls.length === 0) {
    throw new Error(
      "Este take precisa da imagem pronta. Espere a cena (imagem) concluir e tente de novo."
    );
  }

  const resolution =
    block.resolution ||
    model.defaultResolution ||
    (model.kind === "video" ? "720p" : "1K");
  const aspectRatio = block.aspectRatio || "9:16";
  const duration =
    typeof input.duration === "number"
      ? input.duration
      : model.defaultDuration ?? COMPLETE_VIDEO.takeSeconds;
  const cost = estimateKieCredits(model.key, { resolution, duration });

  const kieCredits = await getKieAccountCredits();
  if (kieCredits < cost) {
    throw new Error(
      `Créditos Kie insuficientes. Precisa de ${cost}, tem ${kieCredits}.`
    );
  }

  block = await updateBlock(tenantId, block.id, {
    prompt,
    referenceUrls,
    status: "queued",
    creditsCharged: cost,
    kieModel: model.kieModel,
    errorMessage: null,
  });

  const siteUrl = getSiteUrl() || process.env.NEXT_PUBLIC_SITE_URL || "";
  const callbackSecret =
    process.env.KIE_CALLBACK_SECRET?.trim() ||
    process.env.TRAFFIC_INTERNAL_SECRET?.trim() ||
    "";
  const callBackUrl =
    siteUrl && callbackSecret
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
    const built = buildKieInput({
      modelKey: model.key,
      kieModel,
      prompt,
      aspectRatio,
      resolution,
      referenceUrls:
        kieModel === "grok-imagine-video-1-5-preview"
          ? referenceUrls.slice(0, 1)
          : referenceUrls,
      duration,
    });
    const { taskId } = await createKieTask({
      model: kieModel,
      callBackUrl,
      input: built,
    });
    const updated = await updateBlock(tenantId, block.id, {
      status: "generating",
      kieTaskId: taskId,
      kieModel,
    });
    await touchStoryboard(tenantId, input.storyboardId);
    return updated;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao criar tarefa na Kie AI.";
    await updateBlock(tenantId, block.id, {
      status: "fail",
      errorMessage: message,
    });
    throw new Error(message);
  }
}

export async function mcpSyncBlock(tenantId: string, blockId: string) {
  return syncBlockById(tenantId, blockId);
}
