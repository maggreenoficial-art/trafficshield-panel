import { chatGrok46 } from "@/lib/kie/grok-chat";
import {
  detectOfferNiches,
  looksLikeInfoProduct,
  looksLikeJunkAd,
  NICHE_SCOPE_COPY,
  OFFER_NICHE_IDS,
  parseOfferNiches,
} from "@/lib/offers/niche";
import type { OfferSearchPlan } from "@/lib/offers/search-plan";
import { extractJsonObject } from "@/lib/offers/text";
import type { MetaAd, OfferAdReview } from "@/lib/offers/types";

export type ParsedAdReview = OfferAdReview & {
  id: string;
  keep: boolean;
};

const PRODUCT_TYPES = new Set(["infoproduto", "produto", "none"]);

function asProductType(value: unknown): OfferAdReview["productType"] {
  return typeof value === "string" && PRODUCT_TYPES.has(value)
    ? (value as OfferAdReview["productType"])
    : "none";
}

function asScore(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(10, Math.round(n)));
}

export function parseAdReviews(text: string): ParsedAdReview[] {
  const parsed = extractJsonObject<{
    reviews?: unknown;
    ads?: unknown;
    keep?: unknown;
  }>(text);
  const rows = Array.isArray(parsed?.reviews)
    ? parsed.reviews
    : Array.isArray(parsed?.ads)
      ? parsed.ads
      : [];
  const out: ParsedAdReview[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rec = row as Record<string, unknown>;
    const id = typeof rec.id === "string" ? rec.id.trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const keep = rec.keep !== false && rec.keep !== "false" && rec.keep !== 0;
    const productType = asProductType(rec.productType ?? rec.product_type);
    const score = asScore(rec.score);
    const niches = parseOfferNiches(rec.niches);
    out.push({
      id,
      keep: keep && productType !== "none" && niches.length > 0,
      niches,
      productType,
      score,
      watch: Boolean(rec.watch) && keep && productType !== "none" && score >= 7,
      why:
        typeof rec.why === "string" && rec.why.trim()
          ? rec.why.trim().slice(0, 240)
          : "",
    });
  }
  if (out.length) return out;
  const keepIds = Array.isArray(parsed?.keep)
    ? parsed.keep.filter((id): id is string => typeof id === "string")
    : [];
  return keepIds.map((id) => ({
    id: id.trim(),
    keep: true,
    niches: [],
    productType: "infoproduto" as const,
    score: 6,
    watch: false,
    why: "",
  }));
}

function compactAd(ad: MetaAd) {
  return {
    id: ad.id,
    page: ad.pageName,
    title: ad.title,
    cta: ad.cta,
    body: ad.body.slice(0, 700),
    link: ad.linkUrl,
  };
}

async function reviewBatch(ads: MetaAd[], plan: OfferSearchPlan): Promise<ParsedAdReview[]> {
  const raw = await chatGrok46(
    `Você é media buyer sênior caçando OFERTAS PAGAS na Biblioteca de Anúncios.

RECORTE OBRIGATÓRIO (não saia disso):
${NICHE_SCOPE_COPY}
Nichos: ${OFFER_NICHE_IDS.join(", ")}.

O que CONTA: curso, mentoria, ebook, comunidade paga, método, formação, produto físico vendido nesse ângulo (livro, currículo, material).
O que NÃO CONTA: vaga de emprego, culto ao vivo, doação de igreja, campanha eleitoral, notícia, emagrecer, saúde genérica, aposta, crypto, anúncio que só cita a palavra.

Intenção desta busca: ${JSON.stringify(plan.intent)}
Frase da busca: ${JSON.stringify(plan.query)}

Leia CADA anúncio. Não faça triagem rasa. Decida com o texto.

Lista:
${JSON.stringify(ads.map(compactAd))}

Responda SOMENTE JSON:
{"reviews":[{"id":"id","keep":true,"niches":["cristao"],"productType":"infoproduto","score":0,"watch":false,"why":"motivo curto"}]}
productType só: infoproduto | produto | none
score 0 a 10. watch=true só se for oferta boa para acompanhar a página.`,
    [],
    { reasoning: "low" }
  );
  return parseAdReviews(raw);
}

export async function reviewAdsWithGrok(
  ads: MetaAd[],
  plan: OfferSearchPlan
): Promise<{ ads: MetaAd[]; dropped: number }> {
  if (!ads.length) return { ads: [], dropped: 0 };
  if (!process.env.KIE_AI_API_KEY?.trim()) {
    const lexical = ads.filter((ad) => {
      const hay = [ad.pageName, ad.title ?? "", ad.body, ad.cta ?? ""].join(" ");
      return detectOfferNiches(hay).length > 0 && looksLikeInfoProduct(hay) && !looksLikeJunkAd(hay);
    });
    return { ads: lexical, dropped: Math.max(0, ads.length - lexical.length) };
  }
  const kept = new Map<string, MetaAd>();
  const pending = ads.slice(0, 24);
  const size = 12;
  for (let i = 0; i < pending.length; i += size) {
    const batch = pending.slice(i, i + size);
    try {
      const reviews = await reviewBatch(batch, plan);
      const byId = new Map(reviews.map((item) => [item.id, item]));
      for (const ad of batch) {
        const review = byId.get(ad.id);
        if (!review?.keep) continue;
        kept.set(ad.id, {
          ...ad,
          review: {
            niches: review.niches,
            productType: review.productType,
            score: review.score,
            watch: review.watch,
            why: review.why,
          },
        });
      }
    } catch {
      for (const ad of batch) {
        const hay = [ad.pageName, ad.title ?? "", ad.body, ad.cta ?? ""].join(" ");
        if (looksLikeJunkAd(hay)) continue;
        if (!detectOfferNiches(hay).length || !looksLikeInfoProduct(hay)) continue;
        if (!kept.has(ad.id)) kept.set(ad.id, ad);
      }
    }
  }
  const adsOut = [...kept.values()].sort(
    (a, b) => (b.review?.score ?? 0) - (a.review?.score ?? 0)
  );
  return { ads: adsOut, dropped: Math.max(0, ads.length - adsOut.length) };
}

export async function synthesizeOfferHunt(input: {
  plan: OfferSearchPlan;
  ads: MetaAd[];
}): Promise<{ brief: string; watchKeys: string[] }> {
  if (!input.ads.length || !process.env.KIE_AI_API_KEY?.trim()) {
    return { brief: "", watchKeys: [] };
  }
  const pages = new Map<string, MetaAd[]>();
  for (const ad of input.ads) {
    const key = (ad.pageId || ad.pageName).trim().toLowerCase();
    const list = pages.get(key) ?? [];
    list.push(ad);
    pages.set(key, list);
  }
  const compact = [...pages.entries()].map(([key, group]) => ({
    key,
    page: group[0].pageName,
    ads: group.length,
    score: Math.max(...group.map((ad) => ad.review?.score ?? 0)),
    niches: [...new Set(group.flatMap((ad) => ad.review?.niches ?? []))],
    sample: group[0].title || group[0].body.slice(0, 180),
    watchHint: group.some((ad) => ad.review?.watch),
  }));
  try {
    const raw = await chatGrok46(
      `Você fecha a caça de ofertas do recorte: ${NICHE_SCOPE_COPY}

Intenção: ${JSON.stringify(input.plan.intent)}
Páginas com anúncios que passaram no filtro:
${JSON.stringify(compact)}

Escreva um brief de caçador (o que está vendendo, ângulo, se vale acompanhar).
Marque watch nas páginas que são oferta boa — infoproduto ou produto do recorte, copy comercial, não igreja/política/vaga.

Responda SOMENTE JSON:
{"brief":"2 a 4 frases em português","watch":["key da página"]}`,
      [],
      { reasoning: "low" }
    );
    const parsed = extractJsonObject<{ brief?: unknown; watch?: unknown }>(raw);
    const watchKeys = Array.isArray(parsed?.watch)
      ? parsed.watch
          .filter((key): key is string => typeof key === "string" && key.trim().length > 0)
          .map((key) => key.trim().toLowerCase())
      : [];
    return {
      brief:
        typeof parsed?.brief === "string" ? parsed.brief.trim().slice(0, 500) : "",
      watchKeys,
    };
  } catch {
    return {
      brief: "",
      watchKeys: compact.filter((item) => item.watchHint).map((item) => item.key),
    };
  }
}
