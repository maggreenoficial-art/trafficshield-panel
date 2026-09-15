import { getApiKey } from "@/lib/kie/client";

const KIE_BASE = "https://api.kie.ai";

type GrokOutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

function extractSseText(raw: string): string {
  const chunks: string[] = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) continue;
    const data = trimmed.slice(5).trim();
    if (!data || data === "[DONE]") continue;
    try {
      const event = JSON.parse(data) as {
        delta?: string;
        text?: string;
        type?: string;
        response?: unknown;
      };
      if (typeof event.delta === "string") chunks.push(event.delta);
      if (typeof event.text === "string" && event.type === "response.output_text.delta") {
        chunks.push(event.text);
      }
      const nested = extractText(event.response ?? event);
      if (nested) chunks.push(nested);
    } catch {
      /* ignore malformed sse line */
    }
  }
  return chunks.join("");
}

function extractText(payload: unknown): string {
  if (typeof payload === "string") {
    const t = payload.trim();
    if (t.startsWith("{") || t.startsWith("[")) {
      try {
        return extractText(JSON.parse(t));
      } catch {
        return t;
      }
    }
    if (t.includes("data:")) return extractSseText(t) || t;
    return t;
  }
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  const body = (root.data ?? payload) as Record<string, unknown>;

  if (typeof body.output_text === "string") return body.output_text;

  const output = body.output;
  if (Array.isArray(output)) {
    const chunks: string[] = [];
    for (const item of output as GrokOutputItem[]) {
      for (const part of item.content ?? []) {
        if (part?.text) chunks.push(part.text);
      }
      if (typeof (item as { text?: string }).text === "string") {
        chunks.push((item as { text: string }).text);
      }
    }
    if (chunks.length) return chunks.join("\n");
  }

  if (typeof body.text === "string") return body.text;
  if (typeof body.msg === "string") return "";
  return "";
}

function errorFromBody(status: number, raw: string, parsed: Record<string, unknown> | null) {
  const err = parsed?.error as { message?: string } | string | undefined;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object" && err.message) return err.message;
  if (typeof parsed?.msg === "string" && parsed.msg.trim()) return parsed.msg;
  const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 220);
  if (/an error occurred/i.test(raw)) {
    return "A Kie/Grok falhou internamente. Tente de novo em alguns segundos.";
  }
  return snippet || `Kie Grok HTTP ${status}`;
}

/** Chat síncrono Grok 4.6 via Kie (`KIE_AI_API_KEY`). */
export async function chatGrok46(prompt: string): Promise<string> {
  const res = await fetch(`${KIE_BASE}/grok/v1/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-4-6",
      stream: false,
      reasoning: { effort: "low" },
      input: prompt,
    }),
  });

  const raw = await res.text();
  let parsed: Record<string, unknown> | null = null;
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      parsed = JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if (!res.ok) {
    throw new Error(errorFromBody(res.status, raw, parsed));
  }

  const text = (parsed ? extractText(parsed) : extractText(raw)).trim();
  if (!text) {
    throw new Error(
      errorFromBody(res.status, raw, parsed) || "Grok 4.6 não devolveu texto."
    );
  }
  return text;
}
