/** Catálogo de modelos Storyboard → Kie AI (custos em créditos Kie) */

export type StoryboardMediaKind = "image" | "video";

export type StoryboardModelKey =
  | "logo"
  | "image"
  | "image_hq"
  | "img2video_hq"
  | "img2video_lq"
  | "animate"
  | "motion";

export type StoryboardModelDef = {
  key: StoryboardModelKey;
  label: string;
  kind: StoryboardMediaKind;
  /** Custo em créditos Kie (conta da API) */
  credits: number;
  kieModel: string;
  requiresReference: boolean;
  /** Precisa de vídeo de referência (imitar movimento) */
  requiresMotionVideo?: boolean;
  defaultResolution?: string;
  description?: string;
};

/** GPT Image 2 — preços oficiais Kie */
export const GPT_IMAGE_2_CREDITS: Record<string, number> = {
  "1K": 6,
  "2K": 10,
  "4K": 16,
};

export const STORYBOARD_MODELS: StoryboardModelDef[] = [
  {
    key: "logo",
    label: "Criar Logotipo",
    kind: "image",
    credits: 6,
    kieModel: "gpt-image-2-text-to-image",
    requiresReference: false,
    defaultResolution: "1K",
    description: "GPT Image 2 — fundo transparente",
  },
  {
    key: "image",
    label: "Criar imagem",
    kind: "image",
    credits: 6,
    kieModel: "gpt-image-2-text-to-image",
    requiresReference: false,
    defaultResolution: "1K",
  },
  {
    key: "image_hq",
    label: "Criar imagem (Alta qualidade)",
    kind: "image",
    credits: 10,
    kieModel: "gpt-image-2-text-to-image",
    requiresReference: false,
    defaultResolution: "2K",
  },
  {
    key: "img2video_hq",
    label: "Imagem para vídeo (Alta qualidade)",
    kind: "video",
    credits: 55,
    kieModel: "kling-2.6/image-to-video",
    requiresReference: true,
    description: "Kling 2.6 · 5s sem áudio · 55 créditos",
  },
  {
    key: "img2video_lq",
    label: "Imagem para vídeo (baixa qualidade)",
    kind: "video",
    credits: 15,
    kieModel: "bytedance/v1-lite-image-to-video",
    requiresReference: true,
    description: "Bytedance Lite · 5s 720p · ~15 créditos",
  },
  {
    key: "animate",
    label: "Animar Imagem",
    kind: "video",
    credits: 20,
    kieModel: "wan/2-2-a14b-image-to-video-turbo",
    requiresReference: true,
    description: "Wan 2.2 Turbo I2V · anima a imagem · ~20 créditos",
  },
  {
    key: "motion",
    label: "Imitar Movimento",
    kind: "video",
    credits: 80,
    kieModel: "kling-2.6/motion-control",
    requiresReference: true,
    requiresMotionVideo: true,
    description: "Kling 2.6 Motion Control · imagem + vídeo de movimento · ~80 créditos",
  },
];

export function getStoryboardModel(
  key: string
): StoryboardModelDef | undefined {
  return STORYBOARD_MODELS.find((m) => m.key === key);
}

/** Custo estimado em créditos Kie (cobrado na conta da API). */
export function estimateKieCredits(
  modelKey: string,
  resolution = "1K"
): number {
  const model = getStoryboardModel(modelKey);
  if (!model) return 0;
  if (model.kind === "image") {
    return GPT_IMAGE_2_CREDITS[resolution] ?? GPT_IMAGE_2_CREDITS["1K"];
  }
  return model.credits;
}

export function formatKieCredits(value: number): string {
  if (!Number.isFinite(value)) return "0";
  if (Number.isInteger(value)) return String(value);
  return value.toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

export const ASPECT_RATIOS = [
  "auto",
  "1:1",
  "3:2",
  "2:3",
  "4:3",
  "3:4",
  "16:9",
  "9:16",
] as const;

export const IMAGE_RESOLUTIONS = ["1K", "2K", "4K"] as const;

/** Classe para selects do editor (options legíveis no dark) */
export const STORYBOARD_SELECT_CLASS =
  "sb-select w-full rounded-lg border border-white/[0.08] bg-[#151b26] px-2 py-2 text-xs text-white outline-none";
