import type { AdsEngagementRow } from "@/lib/ads-analysis/parse-ads-export";
import type { AnalyzedAd } from "@/lib/ads-analysis/analyze-engagement";

export type CreativeTheme =
  | "jair"
  | "flavio"
  | "evangelicos"
  | "mulheres"
  | "bio";

export const THEME_KEYS = [
  "jair",
  "flavio",
  "evangelicos",
  "mulheres",
  "bio",
] as const satisfies readonly CreativeTheme[];

export const THEME_LABELS: Record<CreativeTheme, string> = {
  jair: "Jair Bolsonaro",
  flavio: "Flávio Bolsonaro",
  evangelicos: "Evangélicos",
  mulheres: "Mulheres",
  bio: "Bio",
};

export type ThemeOverrides = {
  /** Temas extras por nome de campanha. */
  forceCampaigns: Record<string, CreativeTheme[]>;
  /** Temas removidos do automático. */
  denyCampaigns: Record<string, CreativeTheme[]>;
  /** Nomes vindos dos CSVs que você marcou por tema. */
  fileNames: Partial<
    Record<
      CreativeTheme,
      {
        campaigns: string[];
        adsets: string[];
        ads: string[];
      }
    >
  >;
};

export function emptyThemeOverrides(): ThemeOverrides {
  return { forceCampaigns: {}, denyCampaigns: {}, fileNames: {} };
}

export function normThemeText(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_./\\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasPhrase(text: string, phrase: string) {
  return text.includes(normThemeText(phrase));
}

function hasWord(text: string, word: string) {
  const w = normThemeText(word);
  if (!w) return false;
  if (w.includes(" ")) return hasPhrase(text, w);
  return new RegExp(`(^|[^a-z0-9])${escapeRe(w)}([^a-z0-9]|$)`).test(text);
}

function hasAnyWord(text: string, words: string[]) {
  return words.some((w) => hasWord(text, w));
}

function hasAnyPhrase(text: string, phrases: string[]) {
  return phrases.some((p) => hasPhrase(text, p));
}

export function detectThemesFromText(raw: string): CreativeTheme[] {
  const t = normThemeText(raw);
  if (!t) return [];
  const themes: CreativeTheme[] = [];

  const isFlavio = hasAnyPhrase(t, [
    "flavio bolsonaro",
    "senador flavio",
    "senador flávio",
  ]) || hasAnyWord(t, ["flavio"]);

  const isJair =
    hasAnyPhrase(t, [
      "jair bolsonaro",
      "presidente bolsonaro",
      "presidente jair",
    ]) ||
    hasAnyWord(t, ["jair", "mito", "capitao"]) ||
    (hasWord(t, "bolsonaro") && !isFlavio);

  if (isFlavio) themes.push("flavio");
  if (isJair) themes.push("jair");

  if (
    hasAnyPhrase(t, [
      "igreja",
      "assembleia de deus",
      "palavra de deus",
    ]) ||
    hasAnyWord(t, [
      "evangelic",
      "evangelico",
      "evangelicos",
      "evangelica",
      "pastor",
      "pastores",
      "crente",
      "crentes",
      "gospel",
      "crista",
      "cristao",
      "cristaos",
      "biblia",
      "culto",
      "cultos",
      "assembleia",
    ])
  ) {
    themes.push("evangelicos");
  }

  if (
    hasAnyPhrase(t, [
      "dona de casa",
      "violencia contra",
      "maria da penha",
      "lei maria",
      "direitos da mulher",
      "dia da mulher",
      "dia das mulheres",
      "8 de marco",
      "agressores de mulheres",
      "agressor de mulheres",
      "agressores de mulher",
      "mae de familia",
      "maes de familia",
    ]) ||
    hasAnyWord(t, [
      "mulher",
      "mulheres",
      "feminina",
      "feminino",
      "feminismo",
      "feminicidio",
      "feminicidios",
      "esposa",
      "esposas",
      "mae",
      "maes",
      "menina",
      "meninas",
      "garota",
      "garotas",
      "moca",
      "mocas",
      "elas",
      "agressor",
      "agressores",
      "estupro",
      "assedio",
    ])
  ) {
    themes.push("mulheres");
  }

  if (
    hasAnyPhrase(t, ["historia de vida", "quem e", "quem sou"]) ||
    hasAnyWord(t, ["bio", "biografia", "biografico", "perfil"])
  ) {
    themes.push("bio");
  }

  return uniqueThemes(themes);
}

export function detectThemes(ad: Pick<AnalyzedAd, "campaign" | "adset" | "ad" | "label" | "delivery">): CreativeTheme[] {
  return uniqueThemes([
    ...detectThemesFromText(ad.campaign),
    ...detectThemesFromText(ad.adset),
    ...detectThemesFromText(ad.ad),
    ...detectThemesFromText(ad.label),
    ...detectThemesFromText(ad.delivery),
  ]);
}

function uniqueThemes(list: CreativeTheme[]) {
  return THEME_KEYS.filter((k) => list.includes(k));
}

export function collectNamesFromRows(rows: AdsEngagementRow[]) {
  const campaigns = new Set<string>();
  const adsets = new Set<string>();
  const ads = new Set<string>();
  for (const row of rows) {
    if (row.campaign && row.campaign !== "—") campaigns.add(row.campaign);
    if (row.adset && row.adset !== "—") {
      adsets.add(row.adset);
      adsets.add(`${row.campaign}||${row.adset}`);
    }
    if (row.ad && row.ad !== "—") {
      ads.add(row.ad);
      ads.add(`${row.campaign}||${row.adset}||${row.ad}`);
    }
  }
  return {
    campaigns: [...campaigns],
    adsets: [...adsets],
    ads: [...ads],
  };
}

export function mergeThemeFileNames(
  current: ThemeOverrides["fileNames"],
  theme: CreativeTheme,
  rows: AdsEngagementRow[]
): ThemeOverrides["fileNames"] {
  const extra = collectNamesFromRows(rows);
  const prev = current[theme] ?? { campaigns: [], adsets: [], ads: [] };
  return {
    ...current,
    [theme]: {
      campaigns: [...new Set([...prev.campaigns, ...extra.campaigns])],
      adsets: [...new Set([...prev.adsets, ...extra.adsets])],
      ads: [...new Set([...prev.ads, ...extra.ads])],
    },
  };
}

function fileThemesForAd(ad: AnalyzedAd, fileNames: ThemeOverrides["fileNames"]): CreativeTheme[] {
  const out: CreativeTheme[] = [];
  const adKey = `${ad.campaign}||${ad.adset}||${ad.ad}`;
  const adsetKey = `${ad.campaign}||${ad.adset}`;
  for (const theme of THEME_KEYS) {
    const names = fileNames[theme];
    if (!names) continue;
    if (
      names.campaigns.includes(ad.campaign) ||
      names.adsets.includes(ad.adset) ||
      names.adsets.includes(adsetKey) ||
      names.ads.includes(ad.ad) ||
      names.ads.includes(adKey)
    ) {
      out.push(theme);
    }
  }
  return out;
}

export function resolveAdThemes(
  ad: AnalyzedAd,
  overrides: ThemeOverrides | undefined,
  inherited: CreativeTheme[] = []
): CreativeTheme[] {
  const o = overrides ?? emptyThemeOverrides();
  const auto = uniqueThemes([
    ...detectThemes(ad),
    ...inherited,
    ...fileThemesForAd(ad, o.fileNames),
    ...(o.forceCampaigns[ad.campaign] ?? []),
  ]);
  const deny = new Set(o.denyCampaigns[ad.campaign] ?? []);
  return auto.filter((t) => !deny.has(t));
}

export function scoreCreative(ad: AnalyzedAd) {
  return (
    ad.engagementRate * 1000 +
    Math.log10(Math.max(ad.engagements, 1)) * 10 -
    Math.min(ad.costPerEngagement || 0, 50) * 0.01
  );
}

function pickChampion(list: AnalyzedAd[]): AnalyzedAd | null {
  const eligible = list.filter((a) => a.impressions >= 200 || a.engagements >= 30);
  const pool = eligible.length ? eligible : list;
  if (!pool.length) return null;
  return [...pool].sort((a, b) => scoreCreative(b) - scoreCreative(a))[0];
}

export type ThemeChampion = {
  theme: CreativeTheme;
  label: string;
  champion: AnalyzedAd | null;
  count: number;
  spend: number;
  engagements: number;
  engagementRate: number;
};

export type CampaignChampion = {
  campaign: string;
  champion: AnalyzedAd;
  themes: CreativeTheme[];
};

export function buildThemeReport(
  ads: AnalyzedAd[],
  campaignRows: AnalyzedAd[] = [],
  adsetRows: AnalyzedAd[] = [],
  overrides?: ThemeOverrides
): {
  ads: AnalyzedAd[];
  themes: ThemeChampion[];
  campaigns: CampaignChampion[];
  unmatched: number;
} {
  const campaignInherit = new Map<string, CreativeTheme[]>();
  for (const row of campaignRows) {
    campaignInherit.set(
      row.campaign,
      uniqueThemes([
        ...(campaignInherit.get(row.campaign) ?? []),
        ...detectThemes(row),
      ])
    );
  }
  const adsetInherit = new Map<string, CreativeTheme[]>();
  for (const row of adsetRows) {
    const key = `${row.campaign}||${row.adset}`;
    adsetInherit.set(
      key,
      uniqueThemes([
        ...(adsetInherit.get(key) ?? []),
        ...detectThemes(row),
      ])
    );
  }

  const tagged = ads.map((ad) => {
    const themes = resolveAdThemes(ad, overrides, [
      ...(campaignInherit.get(ad.campaign) ?? []),
      ...(adsetInherit.get(`${ad.campaign}||${ad.adset}`) ?? []),
    ]);
    return { ad: { ...ad, themes }, themes };
  });

  const unmatched = tagged.filter((t) => t.themes.length === 0).length;
  const themedAds = tagged.map((t) => t.ad);

  const themes = THEME_KEYS.map((theme) => {
    const list = tagged.filter((t) => t.themes.includes(theme)).map((t) => t.ad);
    const impressions = list.reduce((s, a) => s + a.impressions, 0);
    const engagements = list.reduce((s, a) => s + a.engagements, 0);
    const spend = list.reduce((s, a) => s + a.spend, 0);
    return {
      theme,
      label: THEME_LABELS[theme],
      champion: pickChampion(list),
      count: list.length,
      spend,
      engagements,
      engagementRate: impressions ? engagements / impressions : 0,
    };
  });

  const byCampaign = new Map<string, AnalyzedAd[]>();
  for (const item of tagged) {
    const key = item.ad.campaign || "—";
    const arr = byCampaign.get(key) ?? [];
    arr.push(item.ad);
    byCampaign.set(key, arr);
  }

  const campaigns: CampaignChampion[] = [...byCampaign.entries()]
    .map(([campaign, list]) => {
      const champion = pickChampion(list);
      if (!champion) return null;
      const campaignThemes = uniqueThemes(list.flatMap((a) => a.themes ?? []));
      return {
        campaign,
        champion,
        themes: campaignThemes,
      };
    })
    .filter((x): x is CampaignChampion => Boolean(x))
    .sort(
      (a, b) =>
        b.champion.engagementRate - a.champion.engagementRate ||
        b.champion.engagements - a.champion.engagements
    );

  return { ads: themedAds, themes, campaigns, unmatched };
}

export function toggleCampaignTheme(
  overrides: ThemeOverrides,
  campaign: string,
  theme: CreativeTheme,
  currentlyOn: boolean
): ThemeOverrides {
  let forceList = [...(overrides.forceCampaigns[campaign] ?? [])];
  let denyList = [...(overrides.denyCampaigns[campaign] ?? [])];

  if (currentlyOn) {
    forceList = forceList.filter((t) => t !== theme);
    if (!denyList.includes(theme)) denyList = [...denyList, theme];
  } else {
    denyList = denyList.filter((t) => t !== theme);
    if (!forceList.includes(theme)) forceList = [...forceList, theme];
  }

  return {
    ...overrides,
    forceCampaigns: {
      ...overrides.forceCampaigns,
      [campaign]: forceList,
    },
    denyCampaigns: {
      ...overrides.denyCampaigns,
      [campaign]: denyList,
    },
  };
}
