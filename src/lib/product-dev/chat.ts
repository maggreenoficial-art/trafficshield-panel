import type { DevScene, DevSceneTake } from "@/lib/product-dev/types";

export const VIDEO_LENGTH_SECONDS = [40, 60, 120] as const;
export type VideoLengthSeconds = (typeof VIDEO_LENGTH_SECONDS)[number];

export function takesForDuration(seconds: number) {
  const safe = seconds === 60 || seconds === 120 ? seconds : 40;
  return Math.ceil(safe / 8);
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function limitTakes(scenes: DevScene[], maxTakes: number) {
  let left = maxTakes;
  const next: DevScene[] = [];
  for (const scene of scenes) {
    if (left <= 0) break;
    const takes = scene.takes.slice(0, left);
    left -= takes.length;
    if (takes.length) next.push({ ...scene, takes });
  }
  return next;
}

export function parseDevScenes(value: unknown): DevScene[] {
  if (!value || typeof value !== "object") return [];
  const scenes = (value as { scenes?: unknown }).scenes;
  if (!Array.isArray(scenes)) return [];
  return scenes
    .map((item) => {
      const row = item as { title?: unknown; prompt?: unknown; takes?: unknown };
      const prompt = asString(row.prompt);
      if (!prompt) return null;
      const takes = Array.isArray(row.takes)
        ? row.takes
            .map((take) => {
              const t = take as {
                title?: unknown;
                prompt?: unknown;
                image?: unknown;
                seconds?: unknown;
                showProduct?: unknown;
              };
              const takePrompt = asString(t.prompt);
              if (!takePrompt) return null;
              const seconds =
                typeof t.seconds === "number" && t.seconds > 0
                  ? Math.min(8, Math.round(t.seconds))
                  : 8;
              const image = asString(t.image);
              const parsed: DevSceneTake = {
                title: asString(t.title) || "Take",
                prompt: takePrompt,
                image: image || undefined,
                seconds,
                showProduct: t.showProduct === true,
              };
              return parsed;
            })
            .filter((t): t is DevSceneTake => Boolean(t))
            .slice(0, 15)
        : [];
      return {
        title: asString(row.title) || "Cena",
        prompt,
        takes,
      };
    })
    .filter((s): s is DevScene => Boolean(s))
    .slice(0, 4);
}

export function parseDevChat(
  text: string,
  maxTakes = 15
): { reply: string; scenes: DevScene[] } {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return { reply: text.trim(), scenes: [] };
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      reply?: unknown;
      storyboard?: unknown;
    };
    const reply = asString(parsed.reply) || text.trim();
    return {
      reply,
      scenes: limitTakes(parseDevScenes(parsed.storyboard), maxTakes),
    };
  } catch {
    return { reply: text.trim(), scenes: [] };
  }
}
