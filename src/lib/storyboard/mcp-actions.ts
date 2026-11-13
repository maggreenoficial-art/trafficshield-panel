import {
  createBlock,
  createStoryboard,
  deleteBlock,
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
  IMAGE_RESOLUTIONS,
  STORYBOARD_MODELS,
  VIDEO_RESOLUTIONS,
  estimateKieCredits,
  getStoryboardModel,
  videoAspectRatiosForModel,
  videoDurationsForModel,
} from "@/lib/kie/models";
import { getSiteUrl } from "@/lib/site-config";
import { COMPLETE_VIDEO } from "@/lib/storyboard/auto-video";
import { syncBlockById } from "@/lib/kie/sync-block";

const BLOCK_W = 300;

function nextOrigin(existing: StoryboardBlock[]) {
  const maxX = existing.reduce((max, b) => Math.max(max, b.positionX), 0);
  return {
    x: existing.length ? maxX + BLOCK_W + 80 : 140,
    y: 80,
  };
}

export function mcpListCapabilities() {
  return {
    models: STORYBOARD_MODELS.map((m) => ({
      key: m.key,
      label: m.label,
      kind: m.kind,
      defaultResolution: m.defaultResolution,
      defaultDuration: m.defaultDuration,
      requiresReference: m.requiresReference,
      description: m.description ?? null,
      aspectRatios:
        m.kind === "video"
          ? [...videoAspectRatiosForModel(m.key)]
          : ["9:16", "16:9", "1:1", "3:4", "4:3", "auto"],
      durations: m.kind === "video" ? [...videoDurationsForModel(m.key)] : null,
    })),
    imageResolutions: [...IMAGE_RESOLUTIONS],
    videoResolutions: [...VIDEO_RESOLUTIONS],
    notes: [
      "Imagem: use create_image com resolution 1K, 2K ou 4K (padrão 1K).",
      "Vídeo: use create_video_take ligado a um bloco de imagem (source_block_id).",
      "Pipeline completo: create_take_pipeline (imagem + 2 takes); image_resolution livre (1K/2K/4K).",
      "Depois de criar, generate_block dispara a Kie; get_block faz poll/sync.",
    ],
  };
}

export async function mcpListStoryboards(tenantId: string) {
  const [storyboards, credits] = await Promise.all([
    listStoryboards(tenantId),
    getKieAccountCredits().catch(() => 0),
  ]);
  return { storyboards, credits, capabilities: mcpListCapabilities() };
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

export async function mcpCreateImage(
  tenantId: string,
  input: {
    storyboardId: string;
    prompt: string;
    resolution?: string;
    aspectRatio?: string;
    modelKey?: string;
    referenceUrls?: string[];
    startGeneration?: boolean;
  }
) {
  const board = await getStoryboard(tenantId, input.storyboardId);
  if (!board) throw new Error("Storyboard não encontrado.");

  const modelKey = input.modelKey || "image";
  const model = getStoryboardModel(modelKey);
  if (!model || model.kind !== "image") {
    throw new Error("Modelo de imagem inválido. Use: image, image_hq ou logo.");
  }

  const resolution = (input.resolution || model.defaultResolution || "1K").toUpperCase();
  if (!IMAGE_RESOLUTIONS.includes(resolution as (typeof IMAGE_RESOLUTIONS)[number])) {
    throw new Error(`Resolução inválida. Use: ${IMAGE_RESOLUTIONS.join(", ")}.`);
  }

  const existing = await listBlocks(tenantId, input.storyboardId);
  const origin = nextOrigin(existing);
  const aspect = input.aspectRatio || "9:16";
  const refs = (input.referenceUrls ?? []).filter(Boolean);

  const block = await createBlock(tenantId, {
    storyboardId: input.storyboardId,
    modelKey: model.key,
    prompt: input.prompt.trim(),
    aspectRatio: aspect,
    resolution,
    referenceUrls: refs,
    positionX: origin.x,
    positionY: origin.y,
    status: "draft",
    creditsCharged: estimateKieCredits(model.key, resolution),
    kieModel: model.kieModel,
  });
  await touchStoryboard(tenantId, input.storyboardId);

  if (input.startGeneration !== false) {
    return mcpStartGeneration(tenantId, {
      storyboardId: input.storyboardId,
      blockId: block.id,
      resolution,
    });
  }
  return block;
}

export async function mcpCreateVideoTake(
  tenantId: string,
  input: {
    storyboardId: string;
    prompt: string;
    sourceBlockId?: string | null;
    referenceUrls?: string[];
    modelKey?: string;
    resolution?: string;
    aspectRatio?: string;
    duration?: number;
    startGeneration?: boolean;
  }
) {
  const board = await getStoryboard(tenantId, input.storyboardId);
  if (!board) throw new Error("Storyboard não encontrado.");

  const modelKey = input.modelKey || "grok_15";
  const model = getStoryboardModel(modelKey);
  if (!model || model.kind !== "video") {
    throw new Error(
      "Modelo de vídeo inválido. Use: grok_15, seedance_15 ou seedance_2."
    );
  }

  const resolution = input.resolution || model.defaultResolution || "720p";
  if (!VIDEO_RESOLUTIONS.includes(resolution as (typeof VIDEO_RESOLUTIONS)[number])) {
    throw new Error(`Resolução de vídeo inválida. Use: ${VIDEO_RESOLUTIONS.join(", ")}.`);
  }

  let sourceBlockId = input.sourceBlockId ?? null;
  let referenceUrls = (input.referenceUrls ?? []).filter(Boolean);
  if (sourceBlockId) {
    const source = await getBlockById(tenantId, sourceBlockId);
    if (!source || source.storyboardId !== input.storyboardId) {
      throw new Error("Bloco de origem inválido.");
    }
    if (source.resultUrl && !referenceUrls.includes(source.resultUrl)) {
      referenceUrls = [source.resultUrl, ...referenceUrls];
    }
  }

  const existing = await listBlocks(tenantId, input.storyboardId);
  const origin = nextOrigin(existing);
  const duration = input.duration ?? model.defaultDuration ?? COMPLETE_VIDEO.takeSeconds;

  const block = await createBlock(tenantId, {
    storyboardId: input.storyboardId,
    modelKey: model.key,
    prompt: input.prompt.trim(),
    aspectRatio: input.aspectRatio || "9:16",
    resolution,
    referenceUrls,
    positionX: origin.x,
    positionY: origin.y + (sourceBlockId ? 0 : 0),
    status: "draft",
    sourceBlockId,
    creditsCharged: estimateKieCredits(model.key, { resolution, duration }),
    kieModel: model.kieModel,
  });
  await touchStoryboard(tenantId, input.storyboardId);

  if (input.startGeneration) {
    return mcpStartGeneration(tenantId, {
      storyboardId: input.storyboardId,
      blockId: block.id,
      duration,
      resolution,
    });
  }
  return block;
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
    imageResolution?: string;
    videoResolution?: string;
    videoModelKey?: string;
    startImage?: boolean;
  }
) {
  const board = await getStoryboard(tenantId, input.storyboardId);
  if (!board) throw new Error("Storyboard não encontrado.");

  const existing = await listBlocks(tenantId, input.storyboardId);
  const origin = nextOrigin(existing);
  const aspect = input.aspectRatio || "9:16";
  const refs = input.baseImageUrl?.trim()
    ? [input.baseImageUrl.trim()]
    : [];
  const imageResolution = (
    input.imageResolution || COMPLETE_VIDEO.imageResolution
  ).toUpperCase();
  if (
    !IMAGE_RESOLUTIONS.includes(
      imageResolution as (typeof IMAGE_RESOLUTIONS)[number]
    )
  ) {
    throw new Error(`Resolução de imagem inválida. Use: ${IMAGE_RESOLUTIONS.join(", ")}.`);
  }

  const videoModelKey = input.videoModelKey || "grok_15";
  const videoModel = getStoryboardModel(videoModelKey);
  if (!videoModel || videoModel.kind !== "video") {
    throw new Error("Modelo de vídeo inválido.");
  }
  const videoResolution =
    input.videoResolution ||
    videoModel.defaultResolution ||
    COMPLETE_VIDEO.videoResolution;

  const image = await createBlock(tenantId, {
    storyboardId: input.storyboardId,
    modelKey: "image",
    prompt: input.imagePrompt.trim(),
    aspectRatio: aspect,
    resolution: imageResolution,
    referenceUrls: refs,
    positionX: origin.x,
    positionY: origin.y,
    status: "draft",
    creditsCharged: estimateKieCredits("image", imageResolution),
    kieModel: getStoryboardModel("image")?.kieModel,
  });

  const take1 = await createBlock(tenantId, {
    storyboardId: input.storyboardId,
    modelKey: videoModel.key,
    prompt: input.take1Prompt.trim(),
    aspectRatio: aspect,
    resolution: videoResolution,
    referenceUrls: [],
    positionX: origin.x + BLOCK_W + 80,
    positionY: origin.y,
    status: "draft",
    sourceBlockId: image.id,
    creditsCharged: estimateKieCredits(videoModel.key, {
      resolution: videoResolution,
      duration: COMPLETE_VIDEO.takeSeconds,
    }),
    kieModel: videoModel.kieModel,
  });

  const take2 = await createBlock(tenantId, {
    storyboardId: input.storyboardId,
    modelKey: videoModel.key,
    prompt: input.take2Prompt.trim(),
    aspectRatio: aspect,
    resolution: videoResolution,
    referenceUrls: [],
    positionX: origin.x + BLOCK_W + 80,
    positionY: origin.y + 560,
    status: "draft",
    sourceBlockId: image.id,
    creditsCharged: estimateKieCredits(videoModel.key, {
      resolution: videoResolution,
      duration: COMPLETE_VIDEO.takeSeconds,
    }),
    kieModel: videoModel.kieModel,
  });

  await touchStoryboard(tenantId, input.storyboardId);

  let startedImage: StoryboardBlock | null = null;
  if (input.startImage !== false) {
    startedImage = await mcpStartGeneration(tenantId, {
      storyboardId: input.storyboardId,
      blockId: image.id,
      resolution: imageResolution,
    });
  }

  return {
    image: startedImage ?? image,
    take1,
    take2,
    imageResolution,
    videoResolution,
    note:
      "Gere a imagem primeiro. Quando status=success, chame generate_block nos dois takes.",
  };
}

export async function mcpUpdateBlock(
  tenantId: string,
  input: {
    storyboardId: string;
    blockId: string;
    prompt?: string;
    resolution?: string;
    aspectRatio?: string;
    modelKey?: string;
    referenceUrls?: string[];
    sourceBlockId?: string | null;
  }
) {
  const existing = await getBlockById(tenantId, input.blockId);
  if (!existing || existing.storyboardId !== input.storyboardId) {
    throw new Error("Bloco não encontrado.");
  }

  const modelKey = input.modelKey ?? existing.modelKey;
  const model = getStoryboardModel(modelKey);
  if (!model) throw new Error("Modelo inválido.");

  let resolution = input.resolution ?? existing.resolution;
  if (model.kind === "image" && resolution) {
    resolution = resolution.toUpperCase();
    if (
      !IMAGE_RESOLUTIONS.includes(
        resolution as (typeof IMAGE_RESOLUTIONS)[number]
      )
    ) {
      throw new Error(`Resolução inválida. Use: ${IMAGE_RESOLUTIONS.join(", ")}.`);
    }
  }

  const updated = await updateBlock(tenantId, input.blockId, {
    prompt: input.prompt,
    resolution,
    aspectRatio: input.aspectRatio,
    modelKey: input.modelKey,
    referenceUrls: input.referenceUrls,
    sourceBlockId: input.sourceBlockId,
    kieModel: model.kieModel,
    creditsCharged: estimateKieCredits(model.key, {
      resolution: resolution || model.defaultResolution,
      duration: model.defaultDuration,
    }),
  });
  await touchStoryboard(tenantId, input.storyboardId);
  return updated;
}

export async function mcpDeleteBlock(
  tenantId: string,
  input: { storyboardId: string; blockId: string }
) {
  const existing = await getBlockById(tenantId, input.blockId);
  if (!existing || existing.storyboardId !== input.storyboardId) {
    throw new Error("Bloco não encontrado.");
  }
  await deleteBlock(tenantId, input.blockId);
  await touchStoryboard(tenantId, input.storyboardId);
  return { ok: true, deletedId: input.blockId };
}

export async function mcpStartGeneration(
  tenantId: string,
  input: {
    storyboardId: string;
    blockId: string;
    prompt?: string;
    referenceUrls?: string[];
    duration?: number;
    resolution?: string;
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

  let resolution =
    input.resolution ||
    block.resolution ||
    model.defaultResolution ||
    (model.kind === "video" ? "720p" : "1K");
  if (model.kind === "image") {
    resolution = resolution.toUpperCase();
  }

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
    resolution,
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
