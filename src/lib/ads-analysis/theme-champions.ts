import type { AnalyzedAd } from "@/lib/ads-analysis/analyze-engagement";

export type CreativeTheme =
  | "jair"
  | "flavio"
  | "evangelicos"
  | "mulheres"
  | "bio";

export const THEME_LABELS: Record<CreativeTheme, string> = {
  jair: "Jair Bolsonaro",
  flavio: "Flávio Bolsonaro",
  evangelicos: "Evangélicos",
  mulheres: "Mulheres",
  bio: "Bio",
};

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[_-]+/g, " ");
}

function haystack(ad: AnalyzedAd) {
  return norm(`${ad.campaign} ${ad.adset} ${ad.ad} ${ad.label} ${ad.delivery}`);
}

function hasAny(text: string, terms: string[]) {
  return terms.some((t) => text.includes(t));
}

export function detectThemes(ad: AnalyzedAd): CreativeTheme[] {
  const t = haystack(ad);
  const themes: CreativeTheme[] = [];

  const isFlavio = hasAny(t, [
    "flavio bolsonaro",
    "flávio bolsonaro",
    "flavio",
    "senador flavio",
    "fb ",
  ]);
  const isJair =
    hasAny(t, [
      "jair bolsonaro",
      "jair",
      "mito",
      "presidente bolsonaro",
      "capitao",
    ]) ||
    (t.includes("bolsonaro") && !isFlavio);

  if (isFlavio) themes.push("flavio");
  if (isJair) themes.push("jair");

  if (
    hasAny(t, [
      "evangelic",
      "igreja",
      "pastor",
      "crente",
      "gospel",
      "crista",
      "cristao",
      "biblia",
      "culto",
      "fe ",
      "deus",
      "assembleia",
    ])
  ) {
    themes.push("evangelicos");
  }

  if (
    hasAny(t, [
      "mulher",
      "mulheres",
      "mae ",
      "maes",
      "dona de casa",
      "feminina",
      "elas",
      "esposa",
    ])
  ) {
    themes.push("mulheres");
  }

  if (
    hasAny(t, [
      " bio",
      "bio ",
      "biografia",
      "quem e",
      "quem sou",
      "historia de vida",
      "perfil",
    ]) ||
    /(^|[^a-z])bio([^a-z]|$)/.test(t)
  ) {
    themes.push("bio");
  }

  return themes;
}

function scoreCreative(ad: AnalyzedAd) {
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

export function buildThemeReport(ads: AnalyzedAd[]): {
  themes: ThemeChampion[];
  campaigns: CampaignChampion[];
  unmatched: number;
} {
  const tagged = ads.map((ad) => ({ ad, themes: detectThemes(ad) }));
  const unmatched = tagged.filter((t) => t.themes.length === 0).length;

  const themes = (Object.keys(THEME_LABELS) as CreativeTheme[]).map((theme) => {
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
  for (const ad of ads) {
    const key = ad.campaign || "—";
    const arr = byCampaign.get(key) ?? [];
    arr.push(ad);
    byCampaign.set(key, arr);
  }

  const campaigns: CampaignChampion[] = [...byCampaign.entries()]
    .map(([campaign, list]) => {
      const champion = pickChampion(list);
      if (!champion) return null;
      return {
        campaign,
        champion,
        themes: detectThemes(champion),
      };
    })
    .filter((x): x is CampaignChampion => Boolean(x))
    .sort(
      (a, b) =>
        b.champion.engagementRate - a.champion.engagementRate ||
        b.champion.engagements - a.champion.engagements
    );

  return { themes, campaigns, unmatched };
}
