export type AdsEngagementRow = {
  campaign: string;
  adset: string;
  ad: string;
  delivery: string;
  impressions: number;
  reach: number;
  spend: number;
  budget: number;
  actions: number;
  pageEngagement: number;
  engagements: number;
  costPerPostEngagement: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  igFollowers: number;
  views: number;
  video50: number;
  video75: number;
  thruplay: number;
  frequency: number;
  cpm: number;
};

/** Nomes exatamente como no Gerenciador (PT), mais variações comuns. */
const HEADER_ALIASES: Record<keyof AdsEngagementRow, string[]> = {
  campaign: ["campanha", "nome da campanha", "campaign name"],
  adset: [
    "nome do conjunto de anuncios",
    "nome do conjunto de anúncios",
    "conjunto de anuncios",
    "ad set name",
  ],
  ad: ["nome do anuncio", "nome do anúncio", "ad name"],
  delivery: ["veiculacao", "veiculação", "delivery"],
  impressions: ["impressoes", "impressões", "impressions"],
  reach: ["alcance", "reach"],
  spend: ["valor gasto", "valor usado", "amount spent"],
  budget: ["orcamento", "orçamento", "budget"],
  actions: ["acoes", "ações", "actions"],
  pageEngagement: [
    "engajamento com a pagina",
    "engajamento com a página",
    "page engagement",
  ],
  engagements: [
    "engajamentos com o post",
    "engajamento com o post",
    "engajamento com a publicacao",
    "post engagements",
  ],
  costPerPostEngagement: [
    "custo por engajamento com o post",
    "cost per post engagement",
  ],
  reactions: ["reacoes ao post", "reações ao post", "post reactions"],
  comments: ["comentarios no post", "comentários no post", "post comments"],
  shares: [
    "compartilhamentos do post",
    "post shares",
  ],
  saves: ["salvamentos do post", "post saves"],
  igFollowers: [
    "seguidores no instagram",
    "instagram follows",
    "instagram followers",
  ],
  views: ["visualizacoes", "visualizações", "video views"],
  video50: [
    "reproducoes de 50% do video",
    "reproduções de 50% do vídeo",
    "video watches at 50%",
  ],
  video75: [
    "reproducoes de 75% do video",
    "reproduções de 75% do vídeo",
    "video watches at 75%",
  ],
  thruplay: ["thruplays", "thruplay"],
  frequency: ["frequencia", "frequência", "frequency"],
  cpm: ["cpm (custo por 1.000 impressoes)", "cpm (custo por 1.000 impressões)", "cpm"],
};

function normalizeHeader(value: string) {
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function parseNumber(raw: string): number {
  const t = raw.trim();
  if (!t || t === "-" || t === "—") return 0;
  const negative = t.startsWith("-") || t.startsWith("(");
  let s = t.replace(/[R$\s%()]/g, "");
  if (s.includes(",") && s.includes(".")) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (s.includes(",")) {
    s = s.replace(",", ".");
  }
  const n = Number(s);
  if (!Number.isFinite(n)) return 0;
  return negative && n > 0 ? -n : n;
}

function detectDelimiter(line: string): string {
  const counts = {
    ";": (line.match(/;/g) || []).length,
    ",": (line.match(/,/g) || []).length,
    "\t": (line.match(/\t/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

function splitCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === delimiter && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function scoreHeader(header: string, alias: string): number {
  if (header === alias) return 100;
  if (header.startsWith(alias) || alias.startsWith(header)) return 80;
  if (header.includes(alias) && alias.length >= 8) return 60;
  return 0;
}

function mapHeaderIndex(
  headers: string[]
): Partial<Record<keyof AdsEngagementRow, number>> {
  const map: Partial<Record<keyof AdsEngagementRow, number>> = {};
  const normalized = headers.map(normalizeHeader);
  const used = new Set<number>();
  const keys = Object.keys(HEADER_ALIASES) as (keyof AdsEngagementRow)[];

  const candidates: { key: keyof AdsEngagementRow; idx: number; score: number }[] =
    [];
  for (const key of keys) {
    const aliases = HEADER_ALIASES[key].map(normalizeHeader);
    normalized.forEach((h, idx) => {
      const score = Math.max(...aliases.map((a) => scoreHeader(h, a)));
      if (score > 0) candidates.push({ key, idx, score });
    });
  }

  candidates.sort((a, b) => b.score - a.score || b.key.length - a.key.length);
  for (const c of candidates) {
    if (map[c.key] !== undefined || used.has(c.idx)) continue;
    map[c.key] = c.idx;
    used.add(c.idx);
  }

  return map;
}

function cell(
  cols: string[],
  idx: number | undefined,
  asNumber = false
): string | number {
  if (idx === undefined || idx < 0) return asNumber ? 0 : "";
  const raw = cols[idx] ?? "";
  return asNumber ? parseNumber(raw) : raw.trim();
}

export function parseAdsManagerExport(text: string): {
  rows: AdsEngagementRow[];
  unmatchedHeaders: string[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  let headerIdx = -1;
  let delimiter = ",";
  let headerMap: Partial<Record<keyof AdsEngagementRow, number>> = {};
  let headers: string[] = [];

  for (let i = 0; i < Math.min(lines.length, 25); i++) {
    const d = detectDelimiter(lines[i]);
    const cols = splitCsvLine(lines[i], d);
    const mapped = mapHeaderIndex(cols);
    const hits = Object.keys(mapped).length;
    if (hits >= 4) {
      headerIdx = i;
      delimiter = d;
      headerMap = mapped;
      headers = cols;
      break;
    }
  }

  if (headerIdx < 0) {
    throw new Error(
      "Não encontrei as 22 colunas do Gerenciador. Confira se o CSV tem Engajamentos com o post, Impressões e Campanha."
    );
  }

  const rows: AdsEngagementRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);
    const campaign = String(cell(cols, headerMap.campaign));
    const adset = String(cell(cols, headerMap.adset));
    const ad = String(cell(cols, headerMap.ad));
    const delivery = String(cell(cols, headerMap.delivery));
    if (!campaign && !adset && !ad) continue;
    const low = `${campaign} ${adset} ${ad}`.toLowerCase();
    if (low === "total" || low.startsWith("total ")) continue;

    const reactions = Number(cell(cols, headerMap.reactions, true));
    const comments = Number(cell(cols, headerMap.comments, true));
    const shares = Number(cell(cols, headerMap.shares, true));
    const saves = Number(cell(cols, headerMap.saves, true));
    let engagements = Number(cell(cols, headerMap.engagements, true));
    if (!engagements) {
      engagements = reactions + comments + shares + saves;
    }

    const spend = Number(cell(cols, headerMap.spend, true));
    let cpe = Number(cell(cols, headerMap.costPerPostEngagement, true));
    if (!cpe && engagements) cpe = spend / engagements;

    rows.push({
      campaign: campaign || "—",
      adset: adset || "—",
      ad: ad || "—",
      delivery: delivery || "—",
      impressions: Number(cell(cols, headerMap.impressions, true)),
      reach: Number(cell(cols, headerMap.reach, true)),
      spend,
      budget: Number(cell(cols, headerMap.budget, true)),
      actions: Number(cell(cols, headerMap.actions, true)),
      pageEngagement: Number(cell(cols, headerMap.pageEngagement, true)),
      engagements,
      costPerPostEngagement: cpe,
      reactions,
      comments,
      shares,
      saves,
      igFollowers: Number(cell(cols, headerMap.igFollowers, true)),
      views: Number(cell(cols, headerMap.views, true)),
      video50: Number(cell(cols, headerMap.video50, true)),
      video75: Number(cell(cols, headerMap.video75, true)),
      thruplay: Number(cell(cols, headerMap.thruplay, true)),
      frequency: Number(cell(cols, headerMap.frequency, true)),
      cpm: Number(cell(cols, headerMap.cpm, true)),
    });
  }

  const unmatchedHeaders = headers.filter((_, idx) => {
    return !Object.values(headerMap).includes(idx);
  });

  return { rows, unmatchedHeaders };
}
