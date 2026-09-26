import type { DevCreative, DevPlan } from "@/lib/product-dev/types";

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asCreatives(value: unknown): DevCreative[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as {
        kind?: unknown;
        title?: unknown;
        prompt?: unknown;
        takes?: unknown;
      };
      const prompt = asString(row.prompt);
      const title = asString(row.title) || "Criativo";
      if (!prompt) return null;
      const kind = row.kind === "video" ? "video" : "image";
      const takes = Array.isArray(row.takes)
        ? row.takes
            .map((take) => {
              const t = take as {
                title?: unknown;
                prompt?: unknown;
                seconds?: unknown;
              };
              const takePrompt = asString(t.prompt);
              if (!takePrompt) return null;
              const seconds =
                typeof t.seconds === "number" && t.seconds > 0
                  ? Math.min(12, Math.round(t.seconds))
                  : 8;
              return {
                title: asString(t.title) || "Take",
                prompt: takePrompt,
                seconds,
              };
            })
            .filter((t): t is DevCreative["takes"][number] => Boolean(t))
            .slice(0, 6)
        : [];
      return { kind, title, prompt, takes };
    })
    .filter((c): c is DevCreative => Boolean(c))
    .slice(0, 8);
}

export function parseDevPlan(text: string): DevPlan {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return emptyPlan(text.trim());
  }
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as {
      summary?: unknown;
      copy?: {
        headline?: unknown;
        subheadline?: unknown;
        sections?: unknown;
        cta?: unknown;
        emailSubject?: unknown;
        emailBody?: unknown;
      };
      pageHtml?: unknown;
      creatives?: unknown;
    };
    const sections = Array.isArray(parsed.copy?.sections)
      ? parsed.copy.sections
          .map((section) => {
            const row = section as { title?: unknown; body?: unknown };
            const body = asString(row.body);
            if (!body) return null;
            return { title: asString(row.title) || "Seção", body };
          })
          .filter((s): s is { title: string; body: string } => Boolean(s))
          .slice(0, 8)
      : [];
    return {
      summary: asString(parsed.summary) || text.trim().slice(0, 2000),
      copy: {
        headline: asString(parsed.copy?.headline),
        subheadline: asString(parsed.copy?.subheadline),
        sections,
        cta: asString(parsed.copy?.cta),
        emailSubject: asString(parsed.copy?.emailSubject),
        emailBody: asString(parsed.copy?.emailBody),
      },
      pageHtml: stripScripts(asString(parsed.pageHtml)).slice(0, 120_000),
      creatives: asCreatives(parsed.creatives),
    };
  } catch {
    return emptyPlan(text.trim());
  }
}

function emptyPlan(summary: string): DevPlan {
  return {
    summary,
    copy: {
      headline: "",
      subheadline: "",
      sections: [],
      cta: "",
      emailSubject: "",
      emailBody: "",
    },
    pageHtml: "",
    creatives: [],
  };
}

export function stripScripts(html: string) {
  return html
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+="[^"]*"/gi, "")
    .replace(/\son\w+='[^']*'/gi, "");
}
