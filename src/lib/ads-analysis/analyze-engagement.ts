import type { AdsEngagementRow } from "@/lib/ads-analysis/parse-ads-export";
import {
  buildThemeReport,
  type CampaignChampion,
  type CreativeTheme,
  type ThemeChampion,
  type ThemeOverrides,
} from "@/lib/ads-analysis/theme-champions";
import type { GrokCreativeRanking } from "@/lib/ads-analysis/rank-creatives";

export type AnalysisLevel = "campaign" | "adset" | "ad";

export type AnalyzedAd = AdsEngagementRow & {
  label: string;
  engagementRate: number;
  qualityRate: number;
  costPerEngagement: number;
  viewRate: number;
  hold50: number;
  hold75: number;
  thruplayRate: number;
  verdict: "winner" | "ok" | "fatigue" | "weak";
  themes?: CreativeTheme[];
};

export type CampaignInsight = {
  tone: "good" | "warn" | "bad" | "info";
  title: string;
  body: string;
};

export type EngagementAnalysis = {
  totals: {
    ads: number;
    impressions: number;
    reach: number;
    spend: number;
    budget: number;
    engagements: number;
    comments: number;
    shares: number;
    saves: number;
    views: number;
    video50: number;
    video75: number;
    thruplay: number;
    igFollowers: number;
    pageEngagement: number;
    engagementRate: number;
    costPerEngagement: number;
  };
  ads: AnalyzedAd[];
  insights: CampaignInsight[];
};

export type TripleEngagementAnalysis = {
  campaign: EngagementAnalysis;
  adset: EngagementAnalysis;
  ad: EngagementAnalysis;
  insights: CampaignInsight[];
  themes: ThemeChampion[];
  campaignChampions: CampaignChampion[];
  grok?: GrokCreativeRanking;
  themeOverrides?: ThemeOverrides;
};

function rate(num: number, den: number) {
  if (!den) return 0;
  return num / den;
}

function rowLabel(r: AdsEngagementRow, level: AnalysisLevel) {
  if (level === "ad" && r.ad && r.ad !== "—") return r.ad;
  if (level === "adset" && r.adset && r.adset !== "—") return r.adset;
  return r.campaign;
}

function mergeKey(r: AdsEngagementRow, level: AnalysisLevel) {
  if (level === "campaign") return r.campaign;
  if (level === "adset") return `${r.campaign}||${r.adset}`;
  return `${r.campaign}||${r.adset}||${r.ad}`;
}

function verdictFor(ad: AnalyzedAd, avgEr: number): AnalyzedAd["verdict"] {
  if (ad.frequency >= 3.2 && ad.impressions >= 2000 && ad.engagementRate < avgEr) {
    return "fatigue";
  }
  if (ad.impressions >= 800 && ad.engagementRate >= Math.max(avgEr * 1.25, 0.02)) {
    return "winner";
  }
  if (ad.impressions >= 1500 && ad.engagementRate < Math.min(avgEr * 0.55, 0.012)) {
    return "weak";
  }
  return "ok";
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

export function analyzeEngagement(
  rows: AdsEngagementRow[],
  level: AnalysisLevel = "ad"
): EngagementAnalysis {
  const merged = new Map<string, AdsEngagementRow>();
  for (const row of rows) {
    const key = mergeKey(row, level);
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...row });
      continue;
    }
    const impressions = prev.impressions + row.impressions;
    const spend = prev.spend + row.spend;
    const engagements = prev.engagements + row.engagements;
    merged.set(key, {
      ...prev,
      impressions,
      reach: Math.max(prev.reach, row.reach),
      spend,
      budget: Math.max(prev.budget, row.budget),
      actions: prev.actions + row.actions,
      pageEngagement: prev.pageEngagement + row.pageEngagement,
      engagements,
      costPerPostEngagement: rate(spend, engagements),
      reactions: prev.reactions + row.reactions,
      comments: prev.comments + row.comments,
      shares: prev.shares + row.shares,
      saves: prev.saves + row.saves,
      igFollowers: prev.igFollowers + row.igFollowers,
      views: prev.views + row.views,
      video50: prev.video50 + row.video50,
      video75: prev.video75 + row.video75,
      thruplay: prev.thruplay + row.thruplay,
      frequency: Math.max(prev.frequency, row.frequency),
      cpm: rate(spend * 1000, impressions),
    });
  }

  const totalsBase = [...merged.values()].reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.reach += r.reach;
      acc.spend += r.spend;
      acc.budget += r.budget;
      acc.engagements += r.engagements;
      acc.comments += r.comments;
      acc.shares += r.shares;
      acc.saves += r.saves;
      acc.views += r.views;
      acc.video50 += r.video50;
      acc.video75 += r.video75;
      acc.thruplay += r.thruplay;
      acc.igFollowers += r.igFollowers;
      acc.pageEngagement += r.pageEngagement;
      return acc;
    },
    {
      impressions: 0,
      reach: 0,
      spend: 0,
      budget: 0,
      engagements: 0,
      comments: 0,
      shares: 0,
      saves: 0,
      views: 0,
      video50: 0,
      video75: 0,
      thruplay: 0,
      igFollowers: 0,
      pageEngagement: 0,
    }
  );

  const avgEr = rate(totalsBase.engagements, totalsBase.impressions);

  const ads: AnalyzedAd[] = [...merged.values()]
    .map((r) => {
      const quality = r.comments + r.shares + r.saves;
      const analyzed: AnalyzedAd = {
        ...r,
        label: rowLabel(r, level),
        engagementRate: rate(r.engagements, r.impressions),
        qualityRate: rate(quality, r.impressions),
        costPerEngagement: r.costPerPostEngagement || rate(r.spend, r.engagements),
        viewRate: rate(r.views, r.impressions),
        hold50: rate(r.video50, r.views),
        hold75: rate(r.video75, r.views),
        thruplayRate: rate(r.thruplay, r.views || r.impressions),
        verdict: "ok",
      };
      analyzed.verdict = verdictFor(analyzed, avgEr);
      return analyzed;
    })
    .sort((a, b) => b.engagementRate - a.engagementRate || b.engagements - a.engagements);

  const insights: CampaignInsight[] = [];
  const best = ads[0];
  const worst =
    [...ads].reverse().find((a) => a.impressions >= 500) ?? ads[ads.length - 1];
  const winners = ads.filter((a) => a.verdict === "winner");
  const weak = ads.filter((a) => a.verdict === "weak");
  const fatigue = ads.filter((a) => a.verdict === "fatigue");

  if (best && best.impressions >= 200) {
    insights.push({
      tone: "good",
      title: "Melhor conjunto / veiculação",
      body: `${best.label} lidera engajamento com o post (${pct(best.engagementRate)} ER, ${best.engagements.toLocaleString("pt-BR")} engajamentos, CPE ${brl(best.costPerEngagement)}). ${best.comments || best.shares || best.saves ? "Tem comentário, share ou save — conteúdo que a pessoa quer guardar ou opinar." : "Quase só reação. Peça comentário no copy para subir qualidade."}`,
    });
  }

  if (winners.length) {
    insights.push({
      tone: "good",
      title: "Escalar o que prende",
      body: `${winners.length} linha(s) acima da média. Suba orçamento nelas e clone o formato. Não aumente verba em conjunto com ER baixo só porque ainda tem orçamento.`,
    });
  }

  if (weak.length) {
    insights.push({
      tone: "bad",
      title: "Post morto no feed",
      body: `${weak
        .slice(0, 3)
        .map((w) => w.label)
        .join(", ")} geram impressão e quase não engajam. Pause ou troque criativo — orçamento nessas linhas só treina o algoritmo no errado.`,
    });
  }

  if (fatigue.length) {
    insights.push({
      tone: "warn",
      title: "Possível fadiga",
      body: `${fatigue
        .map((f) => `${f.label} (freq. ${f.frequency.toFixed(1)})`)
        .join("; ")}. Frequência alta + ER abaixo da média: o mesmo público já viu demais.`,
    });
  }

  if (worst && best && worst.label !== best.label && worst.spend > 0) {
    insights.push({
      tone: "warn",
      title: "Dinheiro no criativo errado",
      body: `${worst.label} está fraco (ER ${pct(worst.engagementRate)}, ${brl(worst.spend)} gastos). Realoque para ${best.label}.`,
    });
  }

  const qualityShare = rate(
    ads.reduce((s, a) => s + a.comments + a.shares + a.saves, 0),
    totalsBase.engagements
  );
  if (totalsBase.engagements >= 30) {
    insights.push({
      tone: qualityShare >= 0.12 ? "good" : "info",
      title: "Qualidade (comentário / save / share)",
      body:
        qualityShare >= 0.12
          ? `${pct(qualityShare)} das ações no post são profundas. Isso vale mais que like para o algoritmo de engajamento.`
          : `${pct(qualityShare)} das ações são profundas. Muita reação rasa. Teste pergunta no primeiro comentário.`,
    });
  }

  if (totalsBase.igFollowers > 0 || totalsBase.pageEngagement > 0) {
    insights.push({
      tone: "info",
      title: "Página e Instagram",
      body: `${totalsBase.pageEngagement.toLocaleString("pt-BR")} engajamentos com a Página e ${totalsBase.igFollowers.toLocaleString("pt-BR")} seguidores no Instagram. Se o objetivo é crescer perfil, priorize linhas com follow barato — não só like no post.`,
    });
  }

  if (totalsBase.views > 0) {
    const viewRate = rate(totalsBase.views, totalsBase.impressions);
    const hold50 = rate(totalsBase.video50, totalsBase.views);
    const hold75 = rate(totalsBase.video75, totalsBase.views);
    const thru = rate(totalsBase.thruplay, totalsBase.views);
    insights.push({
      tone: hold50 >= 0.25 || thru >= 0.15 ? "good" : "warn",
      title: "Retenção do vídeo (50% / 75% / ThruPlay)",
      body: `Visualizações/impressão ${pct(viewRate)}. Chegam em 50%: ${pct(hold50)} · 75%: ${pct(hold75)} · ThruPlay: ${pct(thru)}. Se 50% está baixo, o meio do vídeo perde a pessoa — corte mais cedo. Se só o ThruPlay cai, o final está fraco.`,
    });
  }

  insights.push({
    tone: "info",
    title: "Como decidir",
    body: "Vencedor de engajamento: ER alto + CPE baixo + comentário/save. Vídeo bom: visualizações altas e retenção 50/75% firme. Orçamento deve ir para essas linhas, não para a que só tem impressão barata.",
  });

  return {
    totals: {
      ads: ads.length,
      ...totalsBase,
      engagementRate: avgEr,
      costPerEngagement: rate(totalsBase.spend, totalsBase.engagements),
    },
    ads,
    insights,
  };
}

export function analyzeTriple(
  campaignRows: AdsEngagementRow[],
  adsetRows: AdsEngagementRow[],
  adRows: AdsEngagementRow[],
  themeOverrides?: ThemeOverrides
): TripleEngagementAnalysis {
  const campaign = analyzeEngagement(campaignRows, "campaign");
  const adset = analyzeEngagement(adsetRows, "adset");
  const ad = analyzeEngagement(adRows, "ad");

  const insights: CampaignInsight[] = [];
  const bestC = campaign.ads[0];
  const bestS = adset.ads[0];
  const bestA = ad.ads[0];
  const weakAds = ad.ads.filter((a) => a.verdict === "weak").slice(0, 4);
  const fatigueAds = ad.ads.filter((a) => a.verdict === "fatigue").slice(0, 4);

  if (bestC && bestS && bestA) {
    insights.push({
      tone: "good",
      title: "Onde escalar (3 níveis)",
      body: `Campanha: ${bestC.label} (ER ${pct(bestC.engagementRate)}, ${brl(bestC.spend)}). Conjunto: ${bestS.label}. Anúncio: ${bestA.label}. Suba verba nessa cadeia — não na campanha inteira se só um conjunto carrega o resultado.`,
    });
  }

  if (bestS && bestA && bestA.adset !== "—" && bestA.adset !== bestS.label) {
    insights.push({
      tone: "warn",
      title: "Conjunto e anúncio desalinhados",
      body: `O melhor conjunto é ${bestS.label}, mas o melhor anúncio está em ${bestA.adset}. Confira se o orçamento está no conjunto certo ou se um criativo isolado está salvando um conjunto médio.`,
    });
  }

  if (weakAds.length) {
    insights.push({
      tone: "bad",
      title: "Anúncios para pausar",
      body: weakAds.map((w) => `${w.label} (ER ${pct(w.engagementRate)})`).join(" · "),
    });
  }

  if (fatigueAds.length) {
    insights.push({
      tone: "warn",
      title: "Anúncios com fadiga",
      body: fatigueAds
        .map((f) => `${f.label} · freq. ${f.frequency.toFixed(1)}`)
        .join(" · "),
    });
  }

  const themeReport = buildThemeReport(
    ad.ads,
    campaign.ads,
    adset.ads,
    themeOverrides
  );
  ad.ads = themeReport.ads;
  for (const theme of themeReport.themes) {
    if (!theme.champion) {
      insights.push({
        tone: "info",
        title: `${theme.label}: sem match`,
        body: "Nenhum criativo neste tema. Envie o CSV filtrado do tema ou marque a campanha em Ajustar temas.",
      });
      continue;
    }
    const c = theme.champion;
    insights.push({
      tone: "good",
      title: `Campeão · ${theme.label}`,
      body: `${c.ad !== "—" ? c.ad : c.label} · ${c.adset !== "—" ? c.adset : c.campaign} · ER ${pct(c.engagementRate)} · ${c.engagements.toLocaleString("pt-BR")} engaj. no post · CPE ${brl(c.costPerEngagement)} · ${theme.count} criativos no tema.`,
    });
  }

  insights.push(...ad.insights.filter((i) => i.title !== "Como decidir"));
  insights.push({
    tone: "info",
    title: "Como ler os 3 arquivos",
    body: "Campanha = se o objetivo/estrutura vale a pena. Conjunto = público e lance. Anúncio = criativo do post. Pause anúncio fraco antes de matar o conjunto; pause conjunto fraco antes de matar a campanha.",
  });

  return {
    campaign,
    adset,
    ad,
    insights,
    themes: themeReport.themes,
    campaignChampions: themeReport.campaigns,
    themeOverrides,
  };
}
