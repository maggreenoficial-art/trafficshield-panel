import { getApiKey } from "@/lib/kie/client";
import type { PoliticaSpeaker } from "@/lib/politica/speakers";

const KIE_BASE = "https://api.kie.ai";

type ChatPart = { type?: string; text?: string };

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function partsText(parts: unknown): string {
  if (typeof parts === "string") return parts;
  if (!Array.isArray(parts)) return "";
  return (parts as ChatPart[])
    .map((part) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

export function extractChatText(payload: unknown): string {
  if (typeof payload === "string") return payload.trim();
  const root = asRecord(payload);
  if (!root) return "";
  const body = asRecord(root.data) ?? root;
  if (typeof body.msg === "string" && body.code != null && body.code !== 200) return "";
  if (typeof body.output_text === "string" && body.output_text.trim()) return body.output_text.trim();

  const choices = body.choices;
  if (Array.isArray(choices) && choices[0]) {
    const message = asRecord(asRecord(choices[0])?.message);
    const text = partsText(message?.content);
    if (text.trim()) return text.trim();
  }

  const content = partsText(body.content);
  if (content.trim()) return content.trim();
  if (typeof body.text === "string") return body.text.trim();
  return "";
}

export function payloadError(parsed: Record<string, unknown> | null) {
  if (!parsed) return "";
  const wrapped = parsed.error as { message?: string } | string | undefined;
  if (typeof wrapped === "string" && wrapped.trim()) return wrapped.trim();
  if (wrapped && typeof wrapped === "object" && wrapped.message?.trim()) return wrapped.message.trim();
  if (typeof parsed.msg === "string" && parsed.msg.trim() && parsed.code != null && parsed.code !== 200) {
    return parsed.msg.trim();
  }
  if (parsed.type === "error" && typeof parsed.message === "string") return parsed.message.trim();
  return "";
}

export function isTransientChatError(message: string, status = 0) {
  if (status === 429 || status >= 500) return true;
  return /internal error|try again|overloaded|temporar|timeout|timed out|unavailable/i.test(message);
}

function kieError(status: number, raw: string, parsed: Record<string, unknown> | null) {
  const fromBody = payloadError(parsed);
  if (fromBody) return fromBody;
  const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 220);
  return snippet || `Kie HTTP ${status}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function speakerModels(speaker: PoliticaSpeaker) {
  const extra = "fallbacks" in speaker && Array.isArray(speaker.fallbacks) ? speaker.fallbacks : [];
  return [speaker.model, ...extra].filter((model, index, all) => model && all.indexOf(model) === index);
}

async function chatOnce(speaker: PoliticaSpeaker, prompt: string, model: string) {
  const body =
    speaker.protocol === "anthropic"
      ? {
          model,
          stream: false,
          max_tokens: 2048,
          thinkingFlag: false,
          messages: [{ role: "user", content: prompt }],
        }
      : {
          messages: [
            {
              role: "user",
              content: [{ type: "text", text: prompt }],
            },
          ],
          ...(speaker.id === "gpt" ? { reasoning_effort: "low" } : {}),
        };

  const res = await fetch(`${KIE_BASE}${speaker.path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(120_000),
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

  const err = kieError(res.status, raw, parsed);
  if (!res.ok || (parsed?.code != null && parsed.code !== 200) || payloadError(parsed)) {
    throw new Error(`${speaker.name}: ${err}`);
  }

  const text = extractChatText(parsed ?? raw);
  if (!text) {
    throw new Error(`${speaker.name} não devolveu texto.`);
  }
  return text;
}

export async function chatPoliticaSpeaker(speaker: PoliticaSpeaker, prompt: string) {
  const models = speakerModels(speaker);
  let last: Error | null = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await chatOnce(speaker, prompt, model);
      } catch (error) {
        last = error instanceof Error ? error : new Error(String(error));
        if (!isTransientChatError(last.message) || attempt === 2) break;
        await sleep(1500 * (attempt + 1));
      }
    }
  }
  throw last ?? new Error(`${speaker.name} falhou.`);
}
