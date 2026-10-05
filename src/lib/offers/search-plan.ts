import { chatGrok46 } from "@/lib/kie/grok-chat";
import {
  DEFAULT_HUNT_QUERIES,
  HARD_DROP_TOKENS,
  NICHE_SCOPE_COPY,
  OFFER_NICHE_IDS,
  detectOfferNiches,
  isExplicitlyOutOfScope,
  keywordsMatchNiche,
  parseOfferNiches,
  type OfferNicheId,
} from "@/lib/offers/niche";
import { extractJsonObject, tokenize } from "@/lib/offers/text";

export type OfferSearchPlan = {
  intent: string;
  query: string;
  aliases: string[];
  must: string[];
  drop: string[];
  niches: OfferNicheId[];
  inNiche: boolean;
  hunt: boolean;
  outOfNicheReason: string;
  source: "grok" | "fallback";
};

function uniqueShort(values: unknown[], max: number, maxLen: number) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (typeof value !== "string") continue;
    const item = value.trim().slice(0, maxLen);
    const key = item.toLowerCase();
    if (item.length < 3 || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length >= max) break;
  }
  return out;
}

export function fallbackOfferSearchPlan(
  keywords: string,
  hunt = false
): OfferSearchPlan {
  const query = hunt || !keywords.trim()
    ? DEFAULT_HUNT_QUERIES[0]
    : keywords.trim().slice(0, 80);
  const inHunt = hunt || !keywords.trim();
  const outOfScope = !inHunt && isExplicitlyOutOfScope(keywords);
  const matched = inHunt || keywordsMatchNiche(keywords);
  const inNiche = matched && !outOfScope;
  return {
    intent: inHunt
      ? "Caça de infoprodutos e produtos do recorte conservador/cristão/família"
      : keywords.trim().slice(0, 180),
    query,
    aliases: inHunt ? DEFAULT_HUNT_QUERIES.slice(1) : [],
    must: tokenize(query),
    drop: HARD_DROP_TOKENS,
    niches: inHunt ? [...OFFER_NICHE_IDS] : detectOfferNiches(keywords),
    inNiche,
    hunt: inHunt,
    outOfNicheReason: inNiche
      ? ""
      : `Fora do recorte. ${NICHE_SCOPE_COPY}`,
    source: "fallback",
  };
}

export function parseOfferSearchPlan(
  text: string,
  keywords: string,
  hunt = false
): OfferSearchPlan {
  const fallback = fallbackOfferSearchPlan(keywords, hunt);
  const parsed = extractJsonObject<{
    intent?: unknown;
    query?: unknown;
    aliases?: unknown;
    must?: unknown;
    drop?: unknown;
    niches?: unknown;
    inNiche?: unknown;
    outOfNicheReason?: unknown;
  }>(text);
  if (!parsed) return fallback;
  const query =
    typeof parsed.query === "string" && parsed.query.trim().length >= 3
      ? parsed.query.trim().slice(0, 80)
      : fallback.query;
  const must = uniqueShort(
    Array.isArray(parsed.must) ? parsed.must : fallback.must,
    8,
    40
  );
  const drop = uniqueShort(
    [
      ...(Array.isArray(parsed.drop) ? parsed.drop : []),
      ...HARD_DROP_TOKENS,
    ],
    20,
    40
  );
  const niches = parseOfferNiches(parsed.niches);
  const grokInNiche = parsed.inNiche !== false && parsed.inNiche !== "false";
  const outOfScope = !hunt && isExplicitlyOutOfScope(keywords);
  const inNiche =
    !outOfScope &&
    (hunt ||
      keywordsMatchNiche(keywords) ||
      Boolean(grokInNiche && niches.length > 0));
  return {
    intent:
      typeof parsed.intent === "string" && parsed.intent.trim()
        ? parsed.intent.trim().slice(0, 180)
        : fallback.intent,
    query,
    aliases: uniqueShort(Array.isArray(parsed.aliases) ? parsed.aliases : [], 4, 80),
    must: must.length ? must : fallback.must,
    drop,
    niches: inNiche ? (niches.length ? niches : fallback.niches) : [],
    inNiche,
    hunt,
    outOfNicheReason: inNiche
      ? ""
      : typeof parsed.outOfNicheReason === "string" && parsed.outOfNicheReason.trim()
        ? parsed.outOfNicheReason.trim().slice(0, 240)
        : fallback.outOfNicheReason,
    source: "grok",
  };
}

export async function planOfferSearch(input: {
  keywords: string;
  country: string;
  hunt?: boolean;
}): Promise<OfferSearchPlan> {
  const hunt = Boolean(input.hunt) || !input.keywords.trim();
  const keywords = input.keywords.trim();
  const fallback = fallbackOfferSearchPlan(keywords, hunt);
  if (!hunt && isExplicitlyOutOfScope(keywords)) return fallback;
  if (!process.env.KIE_AI_API_KEY?.trim()) return fallback;
  try {
    const raw = await chatGrok46(
      `Você é media buyer sênior de Meta Ads no Brasil, caçando OFERTAS PAGAS.

RECORTE OBRIGATÓRIO: ${NICHE_SCOPE_COPY}
Nichos permitidos: ${OFFER_NICHE_IDS.join(", ")}.
Não monte busca de emagrecer, saúde, dente, crypto, aposta, vaga, culto ao vivo ou campanha eleitoral.

Modo: ${hunt ? "CAÇA ABERTA — gere frases comerciais cobrindo os 6 nichos (curso, mentoria, método, comunidade, formação)." : "TEMA DO USUÁRIO — só siga se der para virar produto/infoproduto DENTRO do recorte. Se o tema não entra, inNiche=false e não invente outra oferta."}
Tema do usuário: ${hunt ? "(caça aberta)" : JSON.stringify(keywords)}
País: ${input.country || "BR"}

query e aliases devem parecer copy de anúncio pago (2 a 6 palavras).
aliases: até 4 frases alternativas, cada uma de um ângulo do recorte.

Responda SOMENTE JSON válido, sem markdown:
{"inNiche":true,"intent":"o que estamos caçando","query":"frase principal","aliases":["frase"],"must":["tokens da oferta"],"drop":["temas para rejeitar"],"niches":["cristao"],"outOfNicheReason":""}`,
      [],
      { reasoning: "low" }
    );
    return parseOfferSearchPlan(raw, keywords, hunt);
  } catch {
    return fallback;
  }
}
