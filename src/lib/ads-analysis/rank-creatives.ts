import type { AnalyzedAd } from "@/lib/ads-analysis/analyze-engagement";
import {
  detectThemes,
  scoreCreative,
  THEME_LABELS,
} from "@/lib/ads-analysis/theme-champions";

export type AlgorithmRankItem = {
  rank: number;
  name: string;
  campaign: string;
  adset: string;
  score: number;
  engagementRate: number;
  engagements: number;
  reactions: number;
  spend: number;
  costPerEngagement: number;
  impressions: number;
  frequency: number;
  comments: number;
  shares: number;
  saves: number;
  views: number;
  hold50: number;
  hold75: number;
  thruplay: number;
  verdict: AnalyzedAd["verdict"];
  themes: string[];
};

export type GrokRankItem = {
  rank: number;
  name: string;
  reason: string;
};

export type GrokCreativeRanking = {
  opinion: string;
  ranking: GrokRankItem[];
};

export function creativeDisplayName(ad: AnalyzedAd) {
  if (ad.ad && ad.ad !== "—") return ad.ad;
  return ad.label;
}

/** Soma o mesmo criativo em vários conjuntos — o hype é o total, não a linha isolada. */
export function aggregateByCreativeName(ads: AnalyzedAd[]): AnalyzedAd[] {
  const map = new Map<string, AnalyzedAd>();
  for (const ad of ads) {
    const name = creativeDisplayName(ad).trim();
    if (!name || name === "—") continue;
    const key = name.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...ad, ad: name, label: name });
      continue;
    }
    const impressions = prev.impressions + ad.impressions;
    const engagements = prev.engagements + ad.engagements;
    const spend = prev.spend + ad.spend;
    const views = prev.views + ad.views;
    const reactions = prev.reactions + ad.reactions;
    const comments = prev.comments + ad.comments;
    const shares = prev.shares + ad.shares;
    const saves = prev.saves + ad.saves;
    const video50 = prev.video50 + ad.video50;
    const video75 = prev.video75 + ad.video75;
    const thruplay = prev.thruplay + ad.thruplay;
    const reach = prev.reach + ad.reach;
    const keepLead = ad.reactions > prev.reactions ? ad : prev;
    map.set(key, {
      ...prev,
      campaign: keepLead.campaign,
      adset: keepLead.adset,
      delivery: keepLead.delivery,
      impressions,
      reach,
      spend,
      budget: Math.max(prev.budget, ad.budget),
      actions: prev.actions + ad.actions,
      pageEngagement: prev.pageEngagement + ad.pageEngagement,
      engagements,
      costPerPostEngagement: engagements ? spend / engagements : 0,
      reactions,
      comments,
      shares,
      saves,
      igFollowers: prev.igFollowers + ad.igFollowers,
      views,
      video50,
      video75,
      thruplay,
      frequency: reach ? impressions / reach : Math.max(prev.frequency, ad.frequency),
      cpm: impressions ? (spend / impressions) * 1000 : 0,
      engagementRate: impressions ? engagements / impressions : 0,
      qualityRate: impressions ? (comments + shares + saves) / impressions : 0,
      costPerEngagement: engagements ? spend / engagements : 0,
      viewRate: impressions ? views / impressions : 0,
      hold50: views ? video50 / views : 0,
      hold75: views ? video75 / views : 0,
      thruplayRate: views ? thruplay / views : 0,
      verdict: keepLead.verdict,
      themes: [...new Set([...(prev.themes ?? []), ...(ad.themes ?? [])])],
    });
  }
  return [...map.values()];
}

export function rankCreativesAlgorithm(
  ads: AnalyzedAd[],
  limit = 25
): AlgorithmRankItem[] {
  return aggregateByCreativeName(ads)
    .sort(
      (a, b) =>
        scoreCreative(b) - scoreCreative(a) ||
        b.reactions - a.reactions ||
        b.engagements - a.engagements
    )
    .slice(0, limit)
    .map((ad, i) => ({
      rank: i + 1,
      name: creativeDisplayName(ad),
      campaign: ad.campaign,
      adset: ad.adset,
      score: scoreCreative(ad),
      engagementRate: ad.engagementRate,
      engagements: ad.engagements,
      reactions: ad.reactions,
      spend: ad.spend,
      costPerEngagement: ad.costPerEngagement,
      impressions: ad.impressions,
      frequency: ad.frequency,
      comments: ad.comments,
      shares: ad.shares,
      saves: ad.saves,
      views: ad.views,
      hold50: ad.hold50,
      hold75: ad.hold75,
      thruplay: ad.thruplay,
      verdict: ad.verdict,
      themes: (ad.themes?.length ? ad.themes : detectThemes(ad)).map(
        (t) => THEME_LABELS[t]
      ),
    }));
}

export function compactAdsForGrok(ads: AnalyzedAd[], limit = 40) {
  return rankCreativesAlgorithm(ads, limit).map((row) => ({
    name: row.name,
    campaign: row.campaign,
    adset: row.adset,
    impressions: row.impressions,
    spend: Number(row.spend.toFixed(2)),
    reactions: row.reactions,
    engagements: row.engagements,
    er: Number((row.engagementRate * 100).toFixed(3)),
    cpe: Number(row.costPerEngagement.toFixed(4)),
    comments: row.comments,
    shares: row.shares,
    saves: row.saves,
    views: row.views,
    hold50: Number((row.hold50 * 100).toFixed(1)),
    hold75: Number((row.hold75 * 100).toFixed(1)),
    thruplay: row.thruplay,
    frequency: Number(row.frequency.toFixed(2)),
    verdict: row.verdict,
    themes: row.themes,
    algoRank: row.rank,
  }));
}

export function parseGrokRankingJson(text: string): GrokCreativeRanking {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fence?.[1]?.trim() ?? text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) {
    return {
      opinion: text.trim(),
      ranking: [],
    };
  }
  let parsed: { opinion?: unknown; ranking?: unknown };
  try {
    parsed = JSON.parse(raw.slice(start, end + 1)) as {
      opinion?: unknown;
      ranking?: unknown;
    };
  } catch {
    return { opinion: text.trim(), ranking: [] };
  }
  const ranking = Array.isArray(parsed.ranking)
    ? parsed.ranking
        .map((item, i) => {
          const row = item as { rank?: unknown; name?: unknown; reason?: unknown };
          const name = typeof row.name === "string" ? row.name.trim() : "";
          if (!name) return null;
          return {
            rank: typeof row.rank === "number" ? row.rank : i + 1,
            name,
            reason: typeof row.reason === "string" ? row.reason.trim() : "",
          };
        })
        .filter((x): x is GrokRankItem => Boolean(x))
        .sort((a, b) => a.rank - b.rank)
    : [];

  return {
    opinion:
      typeof parsed.opinion === "string" && parsed.opinion.trim()
        ? parsed.opinion.trim()
        : text.trim(),
    ranking,
  };
}
