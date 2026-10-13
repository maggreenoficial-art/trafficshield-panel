import { chatGrok46 } from "@/lib/kie/grok-chat";
import { extractJsonObject } from "@/lib/offers/text";

export type ReportPersona = {
  name: string;
  email: string;
  steps: string;
};

export type ReportBatch = {
  key: string;
  personas: ReportPersona[];
  sent: number;
};

const EMAIL = /^[a-z0-9._+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

export function parseReportPersonas(raw: string, limit: number): ReportPersona[] {
  const parsed = extractJsonObject<{ reports?: unknown }>(raw);
  const rows = Array.isArray(parsed?.reports) ? parsed.reports : [];
  const out: ReportPersona[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const name = String(rec.name ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
    const email = String(rec.email ?? "").trim().toLowerCase().slice(0, 80);
    const steps = String(rec.steps ?? "").replace(/\s+/g, " ").trim().slice(0, 900);
    if (name.split(" ").length < 2) continue;
    if (!EMAIL.test(email)) continue;
    if (steps.length < 40) continue;
    const key = `${name.toLowerCase()}|${email}`;
    if (seen.has(key) || seen.has(email)) continue;
    seen.add(key);
    seen.add(email);
    out.push({ name, email, steps });
    if (out.length >= limit) break;
  }
  return out;
}

function personaPrompt(input: {
  count: number;
  url: string;
  brandUrl: string;
  what: string;
  avoidEmails: string[];
}) {
  const avoid = input.avoidEmails.slice(-40).join(", ") || "nenhum";
  return `Escreva denúncias de phishing para o formulário da Vercel.
Site falso: ${input.url}
Marca imitada: ${input.brandUrl || "não informada"}
O que a página faz: ${input.what}

Gere ${input.count} denúncias. Cada uma é uma pessoa diferente.
Responda só com JSON:
{"reports":[{"name":"Nome Sobrenome","email":"nome.sobrenome@gmail.com","steps":"..."}]}

Regras:
- name: nome completo brasileiro, único, com nome e sobrenome.
- email: único, minúsculo, em gmail.com, outlook.com, hotmail.com ou yahoo.com.
- Não repita estes e-mails: ${avoid}
- steps: português, primeira pessoa, 2 a 4 frases. Diga o que a página finge ser e os passos para ver o phishing (abrir a URL, ver o formulário falso, comparar com a marca). Cada texto com palavras diferentes.
- Não diga que a pessoa perdeu dinheiro se o relato não conta isso.
- Sem markdown.`;
}

export async function generateReportPersonaBatch(input: {
  count: number;
  url: string;
  brandUrl: string;
  what: string;
  avoidEmails: string[];
}): Promise<ReportPersona[]> {
  const count = Math.max(1, Math.min(12, input.count));
  const raw = await chatGrok46(
    personaPrompt({ ...input, count }),
    [],
    { reasoning: "low" }
  );
  return parseReportPersonas(raw, count);
}
