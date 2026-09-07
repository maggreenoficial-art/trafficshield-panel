/** Catálogo de modelos Storyboard → Kie AI */

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
  /** Custo em créditos norat */
  credits: number;
  kieModel: string;
  requiresReference: boolean;
  defaultResolution?: string;
  description?: string;
};

export const STORYBOARD_MODELS: StoryboardModelDef[] = [
  {
    key: "logo",
    label: "Criar Logotipo",
    kind: "image",
    credits: 10,
    kieModel: "gpt-image-2-text-to-image",
    requiresReference: false,
    defaultResolution: "1K",
    description: "GPT Image 2 — fundo transparente",
  },
  {
    key: "image",
    label: "Criar imagem",
    kind: "image",
    credits: 10,
    kieModel: "gpt-image-2-text-to-image",
    requiresReference: false,
    defaultResolution: "1K",
  },
  {
    key: "image_hq",
    label: "Criar imagem (Alta qualidade)",
    kind: "image",
    credits: 20,
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
    description: "Kling 2.6 — UGC premium",
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
    credits: 25,
    kieModel: "bytedance/v1-lite-image-to-video",
    requiresReference: true,
    description: "Anima a imagem de referência",
  },
  {
    key: "motion",
    label: "Imitar Movimento",
    kind: "video",
    credits: 55,
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
