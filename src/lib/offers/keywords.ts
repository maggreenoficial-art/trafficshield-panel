import { chatGrok46 } from "@/lib/kie/grok-chat";
import {
  NICHE_SCOPE_COPY,
  OFFER_NICHE_IDS,
  OFFER_NICHE_LABELS,
  isExplicitlyOutOfScope,
  parseOfferNiches,
  type OfferNicheId,
} from "@/lib/offers/niche";
import { extractJsonObject, foldText } from "@/lib/offers/text";

export type OfferKeywordHint = {
  phrase: string;
  niche: OfferNicheId;
  why: string;
};

export type OfferKeywordHunt = {
  seed: string;
  inNiche: boolean;
  outOfNicheReason: string;
  keywords: OfferKeywordHint[];
  source: "grok" | "fallback";
};

const FALLBACK_BANK: OfferKeywordHint[] = [
  { phrase: "curso valores de direita", niche: "direita", why: "Infoproduto político-conservador pago." },
  { phrase: "mentoria liberal conservadora", niche: "direita", why: "Formação paga no ângulo de direita." },
  { phrase: "método conservador", niche: "conservador", why: "Oferta de método no nicho conservador." },
  { phrase: "formação conservadora", niche: "conservador", why: "Curso/formação de valores tradicionais." },
  { phrase: "formação evangélica", niche: "evangelico", why: "Infoproduto evangélico comercial." },
  { phrase: "mentoria gospel", niche: "evangelico", why: "Mentoria paga no público gospel." },
  { phrase: "curso família cristã", niche: "cristao", why: "Curso pago para o lar cristão." },
  { phrase: "mentoria cristã", niche: "cristao", why: "Acompanhamento pago com ângulo cristão." },
  { phrase: "comunidade patriota", niche: "patriota", why: "Comunidade/oferta para público patriota." },
  { phrase: "método patriota", niche: "patriota", why: "Infoproduto com copy patriota." },
  { phrase: "educação domiciliar", niche: "familias", why: "Produto/curso para famílias (homeschool)." },
  { phrase: "curso casamento cristão", niche: "familias", why: "Infoproduto de casamento no recorte." },
  { phrase: "mentoria para pais", niche: "familias", why: "Oferta para pais e família." },
  { phrase: "valores da família", niche: "familias", why: "Frase comercial do nicho famílias." },
];

function uniqueHints(items: OfferKeywordHint[], max: number): OfferKeywordHint[] {
  const out: OfferKeywordHint[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    const phrase = item.phrase.trim().slice(0, 80);
    const key = foldText(phrase);
    if (phrase.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push({
      phrase,
      niche: item.niche,
      why: item.why.trim().slice(0, 160),
    });
    if (out.length >= max) break;
  }
  return out;
}

function nicheOf(value: unknown, phrase: string): OfferNicheId {
  const parsed = parseOfferNiches([value])[0];
  if (parsed) return parsed;
  const fromPhrase = parseOfferNiches(
    OFFER_NICHE_IDS.filter((id) => foldText(phrase).includes(id))
  )[0];
  return fromPhrase ?? "familias";
}

export function fallbackKeywordHunt(seed: string): OfferKeywordHunt {
  const trimmed = seed.trim();
  if (trimmed && isExplicitlyOutOfScope(trimmed)) {
    return {
      seed: trimmed,
      inNiche: false,
      outOfNicheReason: `Fora do recorte. ${NICHE_SCOPE_COPY}`,
      keywords: [],
      source: "fallback",
    };
  }
  const extras: OfferKeywordHint[] = trimmed
    ? [
        { phrase: trimmed.slice(0, 80), niche: nicheOf(null, trimmed), why: "Tema que você colocou." },
        ...OFFER_NICHE_IDS.map((id) => ({
          phrase: `${trimmed.slice(0, 40)} ${OFFER_NICHE_LABELS[id].toLowerCase()}`.trim(),
          niche: id,
          why: `Variação do nome no nicho ${OFFER_NICHE_LABELS[id]}.`,
        })),
      ]
    : [];
  return {
    seed: trimmed,
    inNiche: true,
    outOfNicheReason: "",
    keywords: uniqueHints([...extras, ...FALLBACK_BANK], 16),
    source: "fallback",
  };
}

export function parseKeywordHunt(text: string, seed: string): OfferKeywordHunt {
  const fallback = fallbackKeywordHunt(seed);
  const parsed = extractJsonObject<{
    inNiche?: unknown;
    outOfNicheReason?: unknown;
    keywords?: unknown;
  }>(text);
  if (!parsed) return fallback;
  const outOfScope = Boolean(seed.trim()) && isExplicitlyOutOfScope(seed);
  if (outOfScope) return fallback;
  const rows = Array.isArray(parsed.keywords) ? parsed.keywords : [];
  const keywords = uniqueHints(
    rows.flatMap((row) => {
      if (!row || typeof row !== "object") return [];
      const rec = row as Record<string, unknown>;
      if (typeof rec.phrase !== "string" || rec.phrase.trim().length < 3) return [];
      return [
        {
          phrase: rec.phrase,
          niche: nicheOf(rec.niche, rec.phrase),
          why: typeof rec.why === "string" ? rec.why : "",
        },
      ];
    }),
    16
  );
  const inNiche = parsed.inNiche !== false && parsed.inNiche !== "false";
  if (!inNiche && !keywords.length) {
    return {
      ...fallback,
      inNiche: false,
      outOfNicheReason:
        typeof parsed.outOfNicheReason === "string" && parsed.outOfNicheReason.trim()
          ? parsed.outOfNicheReason.trim().slice(0, 240)
          : fallback.outOfNicheReason,
      keywords: [],
      source: "grok",
    };
  }
  return {
    seed: seed.trim(),
    inNiche: true,
    outOfNicheReason: "",
    keywords: keywords.length ? keywords : fallback.keywords,
    source: "grok",
  };
}

export async function huntOfferKeywords(input: {
  seed: string;
  country?: string;
}): Promise<OfferKeywordHunt> {
  const seed = input.seed.trim();
  const fallback = fallbackKeywordHunt(seed);
  if (seed && isExplicitlyOutOfScope(seed)) return fallback;
  if (!process.env.KIE_AI_API_KEY?.trim()) return fallback;
  try {
    const raw = await chatGrok46(
      `Você é media buyer sênior no Brasil. Sua tarefa é montar PALAVRAS-CHAVE para buscar OFERTAS PAGAS na Biblioteca de Anúncios da Meta.

RECORTE: ${NICHE_SCOPE_COPY}
Nichos: ${OFFER_NICHE_IDS.join(", ")}.

O usuário colocou este NOME/TEMA: ${seed ? JSON.stringify(seed) : "(nenhum — monte um banco cobrindo os 6 nichos)"}
País: ${input.country || "BR"}

Gere 12 a 16 frases de 2 a 6 palavras, como o anunciante escreveria no anúncio (curso, mentoria, método, comunidade, formação, ebook).
Se o nome for pessoa, página ou guru, NÃO faça campanha eleitoral: monte buscas de infoproduto/produto que o público dele compraria no recorte.
Proibido: vaga, culto ao vivo, vote, emagrecer, dente, crypto, aposta.

Responda SOMENTE JSON:
{"inNiche":true,"outOfNicheReason":"","keywords":[{"phrase":"curso família cristã","niche":"cristao","why":"por que pesquisar isso"}]}`,
      [],
      { reasoning: "low" }
    );
    return parseKeywordHunt(raw, seed);
  } catch {
    return fallback;
  }
}
