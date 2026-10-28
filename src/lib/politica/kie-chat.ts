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

function kieError(status: number, raw: string, parsed: Record<string, unknown> | null) {
  const wrapped = parsed?.error as { message?: string } | string | undefined;
  if (typeof wrapped === "string" && wrapped.trim()) return wrapped.trim();
  if (wrapped && typeof wrapped === "object" && wrapped.message) return wrapped.message;
  if (typeof parsed?.msg === "string" && parsed.msg.trim()) return parsed.msg.trim();
  const snippet = raw.replace(/\s+/g, " ").trim().slice(0, 220);
  return snippet || `Kie HTTP ${status}`;
}

export async function chatPoliticaSpeaker(speaker: PoliticaSpeaker, prompt: string) {
  const body =
    speaker.protocol === "anthropic"
      ? {
          model: speaker.model,
          stream: false,
          max_tokens: 4096,
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

  if (!res.ok || (parsed?.code != null && parsed.code !== 200)) {
    throw new Error(`${speaker.name}: ${kieError(res.status, raw, parsed)}`);
  }

  const text = extractChatText(parsed ?? raw);
  if (!text) {
    throw new Error(`${speaker.name} não devolveu texto.`);
  }
  return text;
}
