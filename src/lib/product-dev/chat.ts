import type { DevScene } from "@/lib/product-dev/types";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
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
              const t = take as { title?: unknown; prompt?: unknown; seconds?: unknown };
              const takePrompt = asString(t.prompt);
              if (!takePrompt) return null;
              const seconds =
                typeof t.seconds === "number" && t.seconds > 0
                  ? Math.min(8, Math.round(t.seconds))
                  : 8;
              return {
                title: asString(t.title) || "Take",
                prompt: takePrompt,
                seconds,
              };
            })
            .filter((t): t is DevScene["takes"][number] => Boolean(t))
            .slice(0, 4)
        : [];
      return {
        title: asString(row.title) || "Cena",
        prompt,
        takes,
      };
    })
    .filter((s): s is DevScene => Boolean(s))
    .slice(0, 3);
}

export function parseDevChat(text: string): { reply: string; scenes: DevScene[] } {
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
    return { reply, scenes: parseDevScenes(parsed.storyboard) };
  } catch {
    return { reply: text.trim(), scenes: [] };
  }
}
