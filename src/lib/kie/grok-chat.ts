import { getApiKey } from "@/lib/kie/client";

const KIE_BASE = "https://api.kie.ai";

type GrokOutputItem = {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
};

function extractText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const root = payload as Record<string, unknown>;
  const body = (root.data ?? payload) as Record<string, unknown>;

  if (typeof body.output_text === "string") return body.output_text;

  const output = body.output;
  if (Array.isArray(output)) {
    const chunks: string[] = [];
    for (const item of output as GrokOutputItem[]) {
      if (item?.type === "message") {
        for (const part of item.content ?? []) {
          if (part?.type === "output_text" && part.text) chunks.push(part.text);
        }
      }
      if (typeof (item as { text?: string }).text === "string") {
        chunks.push((item as { text: string }).text);
      }
    }
    if (chunks.length) return chunks.join("\n");
  }

  if (typeof body.text === "string") return body.text;
  return "";
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
      reasoning: { effort: "medium" },
      input: [
        {
          role: "user",
          content: [{ type: "input_text", text: prompt }],
        },
      ],
    }),
  });

  const json = (await res.json()) as Record<string, unknown>;
  if (!res.ok) {
    const err = json.error as { message?: string } | undefined;
    throw new Error(
      err?.message ||
        (typeof json.msg === "string" ? json.msg : `Kie Grok HTTP ${res.status}`)
    );
  }

  const text = extractText(json).trim();
  if (!text) {
    throw new Error("Grok 4.6 não devolveu texto.");
  }
  return text;
}
