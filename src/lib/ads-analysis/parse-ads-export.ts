export type AdsEngagementRow = {
  campaign: string;
  adset: string;
  ad: string;
  impressions: number;
  reach: number;
  spend: number;
  clicks: number;
  ctr: number;
  engagements: number;
  reactions: number;
  comments: number;
  shares: number;
  saves: number;
  video3s: number;
  thruplay: number;
  frequency: number;
  cpm: number;
};

const HEADER_ALIASES: Record<keyof Omit<AdsEngagementRow, never>, string[]> = {
  campaign: ["nome da campanha", "campaign name", "campaign", "campanha"],
  adset: [
    "nome do conjunto de anúncios",
    "nome do conjunto de anuncios",
    "ad set name",
    "ad set",
    "conjunto de anúncios",
  ],
  ad: ["nome do anúncio", "nome do anuncio", "ad name", "anúncio", "anuncio", "ad"],
  impressions: ["impressões", "impressoes", "impressions"],
  reach: ["alcance", "reach"],
  spend: [
    "valor usado (brl)",
    "valor usado",
    "amount spent",
    "gasto",
    "spend",
    "valor gasto",
  ],
  clicks: [
    "cliques no link",
    "link clicks",
    "clicks (all)",
    "cliques (todos)",
    "cliques",
  ],
  ctr: ["ctr (link)", "ctr (todos)", "ctr"],
  engagements: [
    "engajamento com a publicação",
    "engajamento com a publicacao",
    "post engagements",
    "post engagement",
    "ações na publicação",
    "acoes na publicacao",
  ],
  reactions: ["reações", "reacoes", "reactions", "post reactions"],
  comments: ["comentários", "comentarios", "comments", "post comments"],
  shares: ["compartilhamentos", "shares", "post shares"],
  saves: ["salvamentos", "saves", "post saves"],
  video3s: [
    "visualizações de vídeo de 3 segundos",
    "visualizacoes de video de 3 segundos",
    "3-second video views",
    "video views",
    "reproduções de vídeo",
    "reproducoes de video",
  ],
  frequency: ["frequência", "frequencia", "frequency"],
  thruplay: ["thruplays", "thruplay", "reproduções thruplay"],
  cpm: ["cpm (custo por 1.000 impressões)", "cpm"],
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

function mapHeaderIndex(headers: string[]): Partial<Record<keyof AdsEngagementRow, number>> {
  const map: Partial<Record<keyof AdsEngagementRow, number>> = {};
  const normalized = headers.map(normalizeHeader);

  (Object.keys(HEADER_ALIASES) as (keyof AdsEngagementRow)[]).forEach((key) => {
    const aliases = HEADER_ALIASES[key].map(normalizeHeader);
    const idx = normalized.findIndex((h) =>
      aliases.some((a) => h === a || h.startsWith(a) || a.startsWith(h))
    );
    if (idx >= 0) map[key] = idx;
  });

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
    if (hits >= 3) {
      headerIdx = i;
      delimiter = d;
      headerMap = mapped;
      headers = cols;
      break;
    }
  }

  if (headerIdx < 0) {
    throw new Error(
      "Não encontrei as colunas do Gerenciador. Exporte o CSV com Engajamento com a publicação, Impressões e Nome do anúncio."
    );
  }

  const rows: AdsEngagementRow[] = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cols = splitCsvLine(lines[i], delimiter);
    const ad = String(cell(cols, headerMap.ad));
    const campaign = String(cell(cols, headerMap.campaign));
    if (!ad && !campaign) continue;
    const low = `${ad} ${campaign}`.toLowerCase();
    if (low === "total" || low.startsWith("total ")) continue;

    const reactions = Number(cell(cols, headerMap.reactions, true));
    const comments = Number(cell(cols, headerMap.comments, true));
    const shares = Number(cell(cols, headerMap.shares, true));
    const saves = Number(cell(cols, headerMap.saves, true));
    let engagements = Number(cell(cols, headerMap.engagements, true));
    if (!engagements) {
      engagements = reactions + comments + shares + saves;
    }

    rows.push({
      campaign: campaign || "—",
      adset: String(cell(cols, headerMap.adset) || "—"),
      ad: ad || campaign || `Linha ${rows.length + 1}`,
      impressions: Number(cell(cols, headerMap.impressions, true)),
      reach: Number(cell(cols, headerMap.reach, true)),
      spend: Number(cell(cols, headerMap.spend, true)),
      clicks: Number(cell(cols, headerMap.clicks, true)),
      ctr: Number(cell(cols, headerMap.ctr, true)),
      engagements,
      reactions,
      comments,
      shares,
      saves,
      video3s: Number(cell(cols, headerMap.video3s, true)),
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
