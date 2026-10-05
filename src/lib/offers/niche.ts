import { foldText } from "@/lib/offers/text";

export const OFFER_NICHE_IDS = [
  "direita",
  "conservador",
  "evangelico",
  "cristao",
  "patriota",
  "familias",
] as const;

export type OfferNicheId = (typeof OFFER_NICHE_IDS)[number];

export const OFFER_NICHE_LABELS: Record<OfferNicheId, string> = {
  direita: "Direita",
  conservador: "Conservador",
  evangelico: "Evangélico",
  cristao: "Cristão",
  patriota: "Patriota",
  familias: "Famílias",
};

export const OFFER_NICHE_TOKENS: Record<OfferNicheId, string[]> = {
  direita: [
    "direita",
    "direitista",
    "antipetista",
    "anti petista",
    "liberal conservador",
    "valores de direita",
    "agenda de esquerda",
  ],
  conservador: [
    "conservador",
    "conservadora",
    "conservadorismo",
    "valores tradicionais",
    "agenda conservadora",
    "tradicao",
  ],
  evangelico: [
    "evangelico",
    "evangelica",
    "assembleia de deus",
    "gospel",
    "avivamento",
    "neopentecostal",
    "palavra gospel",
  ],
  cristao: [
    "cristao",
    "crista",
    "cristo",
    "jesus",
    "biblia",
    "oracao",
    "fe crista",
    "palavra de deus",
    "discipulado",
    "igreja",
  ],
  patriota: [
    "patriota",
    "patriotismo",
    "brasil acima",
    "verde amarelo",
    "nacao",
    "bandeira do brasil",
    "soberania",
  ],
  familias: [
    "familia",
    "familias",
    "casamento",
    "pais e filhos",
    "homeschool",
    "educacao domiciliar",
    "esposa",
    "marido",
    "filhos",
    "lar cristao",
  ],
};

export const INFO_PRODUCT_TOKENS = [
  "curso",
  "mentoria",
  "ebook",
  "e book",
  "desafio",
  "comunidade",
  "metodo",
  "formacao",
  "treinamento",
  "aula",
  "turma",
  "inscricao",
  "hotmart",
  "kiwify",
  "braip",
  "eduzz",
  "checkout",
  "garantia",
  "protocolo",
  "imersao",
  "assinatura",
  "area de membros",
  "plano anual",
  "infoproduto",
];

export const HARD_DROP_TOKENS = [
  "vaga",
  "emprego",
  "curriculo",
  "contratamos",
  "clt",
  "concurso",
  "prefeitura",
  "vote",
  "votacao",
  "eleicao",
  "urna",
  "culto ao vivo",
  "horario de culto",
  "transmissao do culto",
];

const OUT_OF_SCOPE_TOKENS = [
  "emagrecer",
  "emagrecimento",
  "ozempic",
  "queima gordura",
  "implante dentario",
  "all on 4",
  "crypto",
  "bitcoin",
  "forex",
  "apostas",
  "cassino",
  "bet365",
];

export const DEFAULT_HUNT_QUERIES = [
  "curso família cristã",
  "mentoria valores da família",
  "formação evangélica",
  "método conservador",
  "comunidade patriota",
];

export const NICHE_SCOPE_COPY =
  "Só produtos e infoprodutos de direita, conservador, evangélico, cristão, patriota e famílias.";

export function parseOfferNiches(values: unknown): OfferNicheId[] {
  if (!Array.isArray(values)) return [];
  const out: OfferNicheId[] = [];
  for (const value of values) {
    if (typeof value !== "string") continue;
    const id = foldText(value).replace(/\s+/g, "") as OfferNicheId;
    const mapped =
      id === "evangelico" || id === "evangelica"
        ? "evangelico"
        : id === "cristao" || id === "crista"
          ? "cristao"
          : id === "familias" || id === "familia"
            ? "familias"
            : (OFFER_NICHE_IDS as readonly string[]).includes(id)
              ? (id as OfferNicheId)
              : null;
    if (mapped && !out.includes(mapped)) out.push(mapped);
  }
  return out;
}

export function hayHasToken(hay: string, token: string) {
  const folded = foldText(token);
  return Boolean(folded) && hay.includes(folded);
}

export function detectOfferNiches(text: string): OfferNicheId[] {
  const hay = foldText(text);
  return OFFER_NICHE_IDS.filter((id) =>
    OFFER_NICHE_TOKENS[id].some((token) => hayHasToken(hay, token))
  );
}

export function keywordsMatchNiche(keywords: string) {
  return detectOfferNiches(keywords).length > 0;
}

export function isExplicitlyOutOfScope(keywords: string) {
  const hay = foldText(keywords);
  if (!hay) return false;
  return OUT_OF_SCOPE_TOKENS.some((token) => hayHasToken(hay, token));
}

export function looksLikeInfoProduct(text: string) {
  const hay = foldText(text);
  return INFO_PRODUCT_TOKENS.some((token) => hayHasToken(hay, token));
}

export function looksLikeJunkAd(text: string) {
  const hay = foldText(text);
  return HARD_DROP_TOKENS.some((token) => hayHasToken(hay, token));
}

export function nicheLabelList(ids: OfferNicheId[]) {
  return ids.map((id) => OFFER_NICHE_LABELS[id]).join(", ");
}
