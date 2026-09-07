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
  /**
   * Custo base em créditos Kie (1K para imagem; 5s para vídeo).
   * Imagem muda com resolução via estimateKieCredits().
   */
  credits: number;
  kieModel: string;
  requiresReference: boolean;
  defaultResolution?: string;
  description?: string;
};

/** GPT Image 2 — preços oficiais Kie: 1K=6, 2K=10, 4K=16 */
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
    credits: 50,
    kieModel: "kling-2.6/image-to-video",
    requiresReference: true,
    description: "Kling 2.6 — UGC premium (~5s)",
  },
  {
    key: "img2video_lq",
    label: "Imagem para vídeo (baixa qualidade)",
    kind: "video",
    credits: 20,
    kieModel: "bytedance/v1-lite-image-to-video",
    requiresReference: true,
    description: "Bytedance Lite — rápido e barato",
  },
  {
    key: "animate",
    label: "Animar Imagem",
    kind: "video",
    credits: 20,
    kieModel: "bytedance/v1-lite-image-to-video",
    requiresReference: true,
    description: "Anima a imagem de referência",
  },
  {
    key: "motion",
    label: "Imitar Movimento",
    kind: "video",
    credits: 50,
    kieModel: "kling-2.6/image-to-video",
    requiresReference: true,
    description: "Kling 2.6 — movimento natural UGC",
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
