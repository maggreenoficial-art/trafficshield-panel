import type { AdsEngagementRow } from "@/lib/ads-analysis/parse-ads-export";

export type AnalyzedAd = AdsEngagementRow & {
  engagementRate: number;
  qualityRate: number;
  costPerEngagement: number;
  hookRate: number;
  holdRate: number;
  verdict: "winner" | "ok" | "fatigue" | "weak";
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
    engagements: number;
    comments: number;
    shares: number;
    video3s: number;
    engagementRate: number;
    costPerEngagement: number;
  };
  ads: AnalyzedAd[];
  insights: CampaignInsight[];
};

function rate(num: number, den: number) {
  if (!den) return 0;
  return num / den;
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

export function analyzeEngagement(rows: AdsEngagementRow[]): EngagementAnalysis {
  const merged = new Map<string, AdsEngagementRow>();
  for (const row of rows) {
    const key = `${row.campaign}||${row.adset}||${row.ad}`;
    const prev = merged.get(key);
    if (!prev) {
      merged.set(key, { ...row });
      continue;
    }
    merged.set(key, {
      ...prev,
      impressions: prev.impressions + row.impressions,
      reach: Math.max(prev.reach, row.reach),
      spend: prev.spend + row.spend,
      clicks: prev.clicks + row.clicks,
      engagements: prev.engagements + row.engagements,
      reactions: prev.reactions + row.reactions,
      comments: prev.comments + row.comments,
      shares: prev.shares + row.shares,
      saves: prev.saves + row.saves,
      video3s: prev.video3s + row.video3s,
      thruplay: prev.thruplay + row.thruplay,
      frequency: Math.max(prev.frequency, row.frequency),
      ctr: rate(prev.clicks + row.clicks, prev.impressions + row.impressions) * 100,
      cpm: rate((prev.spend + row.spend) * 1000, prev.impressions + row.impressions),
    });
  }

  const totalsBase = [...merged.values()].reduce(
    (acc, r) => {
      acc.impressions += r.impressions;
      acc.reach += r.reach;
      acc.spend += r.spend;
      acc.engagements += r.engagements;
      acc.comments += r.comments;
      acc.shares += r.shares;
      acc.video3s += r.video3s;
      return acc;
    },
    {
      impressions: 0,
      reach: 0,
      spend: 0,
      engagements: 0,
      comments: 0,
      shares: 0,
      video3s: 0,
    }
  );

  const avgEr = rate(totalsBase.engagements, totalsBase.impressions);

  const ads: AnalyzedAd[] = [...merged.values()]
    .map((r) => {
      const quality = r.comments + r.shares + r.saves;
      const analyzed: AnalyzedAd = {
        ...r,
        engagementRate: rate(r.engagements, r.impressions),
        qualityRate: rate(quality, r.impressions),
        costPerEngagement: rate(r.spend, r.engagements),
        hookRate: rate(r.video3s, r.impressions),
        holdRate: rate(r.thruplay, r.video3s),
        verdict: "ok",
      };
      analyzed.verdict = verdictFor(analyzed, avgEr);
      return analyzed;
    })
    .sort((a, b) => b.engagementRate - a.engagementRate || b.engagements - a.engagements);

  const insights: CampaignInsight[] = [];
  const best = ads[0];
  const worst = [...ads].reverse().find((a) => a.impressions >= 500) ?? ads[ads.length - 1];
  const winners = ads.filter((a) => a.verdict === "winner");
  const weak = ads.filter((a) => a.verdict === "weak");
  const fatigue = ads.filter((a) => a.verdict === "fatigue");

  if (best && best.impressions >= 200) {
    insights.push({
      tone: "good",
      title: "Melhor post / criativo",
      body: `${best.ad} lidera o engajamento (${pct(best.engagementRate)} de ER, ${best.engagements.toLocaleString("pt-BR")} ações). ${best.comments || best.shares ? "Tem comentário/compartilhamento — sinal de conteúdo que as pessoas querem opinar." : "Volume de reação ok; teste CTA no comentário para subir qualidade."}`,
    });
  }

  if (winners.length) {
    insights.push({
      tone: "good",
      title: "Escalar o que prende",
      body: `${winners.length} anúncio(s) acima da média de engajamento. Suba verba neles e clone a estrutura (gancho, formato, primeiros 3s) em variações novas — não só o mesmo criativo.`,
    });
  }

  if (weak.length) {
    insights.push({
      tone: "bad",
      title: "Criativos mortos no feed",
      body: `${weak.slice(0, 3).map((w) => w.ad).join(", ")} gastam impressão e quase não geram ação no post. Pause ou troque o criativo; manter no ar só treina o algoritmo no errado.`,
    });
  }

  if (fatigue.length) {
    insights.push({
      tone: "warn",
      title: "Possível fadiga",
      body: `${fatigue.map((f) => `${f.ad} (freq. ${f.frequency.toFixed(1)})`).join("; ")}. Frequência alta com ER abaixo da média: a mesma pessoa já viu demais. Rode criativo novo no mesmo conjunto.`,
    });
  }

  if (worst && best && worst.ad !== best.ad && worst.spend > 0) {
    insights.push({
      tone: "warn",
      title: "Dinheiro no criativo errado",
      body: `${worst.ad} está na lanterna (ER ${pct(worst.engagementRate)}, ${brl(worst.spend)}). Compare o gancho com ${best.ad} e realoque verba.`,
    });
  }

  const qualityShare = rate(
    ads.reduce((s, a) => s + a.comments + a.shares + a.saves, 0),
    totalsBase.engagements
  );
  if (totalsBase.engagements >= 50) {
    insights.push({
      tone: qualityShare >= 0.12 ? "good" : "info",
      title: "Qualidade do engajamento",
      body:
        qualityShare >= 0.12
          ? `${pct(qualityShare)} das ações são comentário, share ou save — isso pesa mais que like. Continue pedindo opinião / salvamento no copy.`
          : `${pct(qualityShare)} das ações são “profundas” (comentário/share/save). Muita reação rasa. Teste pergunta no primeiro comentário e gancho polêmico-útil.`,
    });
  }

  if (totalsBase.video3s > 0) {
    const hook = rate(totalsBase.video3s, totalsBase.impressions);
    insights.push({
      tone: hook >= 0.25 ? "good" : "warn",
      title: "Hook dos vídeos (3s)",
      body:
        hook >= 0.25
          ? `Hook ${pct(hook)}: as pessoas param. Mantenha os 3 primeiros segundos iguais em estilo e varie o resto.`
          : `Hook ${pct(hook)} está baixo. Troque os 3s iniciais (rosto falando o problema, texto gigante, corte seco). Sem hook, o resto do vídeo não existe.`,
    });
  }

  insights.push({
    tone: "info",
    title: "Como usar isso no Ads",
    body: "Objetivo de engajamento com a publicação: o vencedor deve ter ER alto e CPE baixo. Se o objetivo for mensagem/venda depois, use os posts que geram comentário — não só like.",
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
