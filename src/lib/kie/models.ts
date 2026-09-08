/** Catálogo Storyboard → Kie AI (preços reais em créditos Kie; 1 crédito ≈ US$ 0.005) */

export type StoryboardMediaKind = "image" | "video";

export type StoryboardModelKey =
  | "logo"
  | "image"
  | "image_hq"
  | "grok_15"
  | "seedance_15"
  | "seedance_2";

export type StoryboardModelDef = {
  key: StoryboardModelKey;
  label: string;
  kind: StoryboardMediaKind;
  /** Fallback / custo base (imagem) ou estimativa default (vídeo) */
  credits: number;
  kieModel: string;
  requiresReference: boolean;
  hasNativeAudio?: boolean;
  defaultResolution?: string;
  defaultDuration?: number;
  description?: string;
};

/** GPT Image 2 — preços oficiais Kie (créditos / imagem) */
export const GPT_IMAGE_2_CREDITS: Record<string, number> = {
  "1K": 6,
  "2K": 10,
  "4K": 16,
};

/**
 * Grok Imagine Video 1.5 — áudio nativo incluso.
 * Fonte kie.ai: I2V 480p US$0.012/s · 720p US$0.0225/s → créditos = USD / 0.005
 * 1080p: estimado ~2× 720p (API aceita 1080p; sem linha explícita no pricing público).
 */
export const GROK_15_CREDITS_PER_SEC: Record<string, number> = {
  "480p": 2.4,
  "720p": 4.5,
  "1080p": 9,
};

/**
 * Seedance 1.5 Pro COM áudio (generate_audio: true).
 * Tabela Kie-style (créditos/s): 480p=2 · 720p=4 · 1080p=8 com áudio.
 * Sem áudio seria metade — no painel áudio fica sempre ligado.
 */
export const SEEDANCE_15_AUDIO_CREDITS_PER_SEC: Record<string, number> = {
  "480p": 2,
  "720p": 4,
  "1080p": 8,
};

/**
 * Seedance 2.0 COM áudio — kie.ai lista ~US$0.057/s (≈ 11.4 créditos/s) em 720p.
 */
export const SEEDANCE_2_AUDIO_CREDITS_PER_SEC: Record<string, number> = {
  "480p": 5.7,
  "720p": 11.4,
  "1080p": 22.8,
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
    key: "grok_15",
    label: "Grok Imagine Video 1.5",
    kind: "video",
    credits: 36,
    kieModel: "grok-imagine-video-1-5-preview",
    requiresReference: true,
    hasNativeAudio: true,
    defaultResolution: "720p",
    defaultDuration: 8,
    description:
      "Áudio nativo + diálogo sync · I2V · 720p ≈ 4,5 cr/s (8s ≈ 36 cr)",
  },
  {
    key: "seedance_15",
    label: "Seedance 1.5 Pro",
    kind: "video",
    credits: 32,
    kieModel: "bytedance/seedance-1.5-pro",
    requiresReference: true,
    hasNativeAudio: true,
    defaultResolution: "720p",
    defaultDuration: 8,
    description:
      "Áudio nativo + voz + lip-sync · I2V · 720p c/ áudio ≈ 4 cr/s (8s ≈ 32 cr)",
  },
  {
    key: "seedance_2",
    label: "Seedance 2.0",
    kind: "video",
    credits: 91,
    kieModel: "bytedance/seedance-2",
    requiresReference: true,
    hasNativeAudio: true,
    defaultResolution: "720p",
    defaultDuration: 8,
    description:
      "Áudio nativo + boa consistência · ~US$0,057/s ≈ 11,4 cr/s (8s ≈ 91 cr)",
  },
];

/** Compat: chaves antigas do painel → modelos novos */
const LEGACY_MODEL_MAP: Record<string, StoryboardModelKey> = {
  img2video_lq: "grok_15",
  img2video_hq: "seedance_15",
  animate: "grok_15",
  motion: "seedance_15",
};

export function resolveModelKey(key: string): StoryboardModelKey | string {
  return LEGACY_MODEL_MAP[key] ?? key;
}

export function getStoryboardModel(
  key: string
): StoryboardModelDef | undefined {
  const resolved = resolveModelKey(key);
  return STORYBOARD_MODELS.find((m) => m.key === resolved);
}

export type CreditEstimateOpts = {
  resolution?: string;
  duration?: number;
};

/** Custo estimado em créditos Kie (cobrado na conta da API). */
export function estimateKieCredits(
  modelKey: string,
  resolutionOrOpts: string | CreditEstimateOpts = "1K",
  durationArg?: number
): number {
  const model = getStoryboardModel(modelKey);
  if (!model) return 0;

  const opts: CreditEstimateOpts =
    typeof resolutionOrOpts === "string"
      ? { resolution: resolutionOrOpts, duration: durationArg }
      : resolutionOrOpts;

  if (model.kind === "image") {
    const res = opts.resolution || model.defaultResolution || "1K";
    return GPT_IMAGE_2_CREDITS[res] ?? GPT_IMAGE_2_CREDITS["1K"];
  }

  const res = opts.resolution || model.defaultResolution || "720p";
  const duration = opts.duration ?? model.defaultDuration ?? 8;
  const rate = videoCreditsPerSec(model.key, res);
  return Math.ceil(rate * duration * 100) / 100;
}

function videoCreditsPerSec(modelKey: string, resolution: string): number {
  const key = resolveModelKey(modelKey);
  const table =
    key === "grok_15"
      ? GROK_15_CREDITS_PER_SEC
      : key === "seedance_15"
        ? SEEDANCE_15_AUDIO_CREDITS_PER_SEC
        : key === "seedance_2"
          ? SEEDANCE_2_AUDIO_CREDITS_PER_SEC
          : null;
  if (!table) return 0;
  return table[resolution] ?? table["720p"] ?? 0;
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
export const VIDEO_RESOLUTIONS = ["480p", "720p", "1080p"] as const;
export const VIDEO_DURATIONS = [5, 6, 8, 10, 12] as const;

export const STORYBOARD_SELECT_CLASS =
  "sb-select w-full rounded-lg border border-white/[0.08] bg-[#151b26] px-2 py-2 text-xs text-white outline-none";
