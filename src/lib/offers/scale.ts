import type { MetaAd } from "@/lib/offers/types";

export type OfferScaleVerdict =
  | "none"
  | "testing"
  | "validated"
  | "scaling"
  | "mature";

export type OfferScalePage = {
  pageName: string;
  count: number;
  oldestStart: string | null;
  newestStart: string | null;
};

export type OfferScaleMonth = {
  month: string;
  label: string;
  count: number;
};

export type OfferScaleSample = {
  id: string;
  pageName: string;
  title: string | null;
  startDate: string | null;
  endDate: string | null;
  snapshotUrl: string;
};

export type OfferScaleReport = {
  keywords: string;
  country: string;
  adCount: number;
  libraryTotal: number | null;
  uniquePages: number;
  oldestStart: string | null;
  newestStart: string | null;
  last7Days: number;
  last14Days: number;
  last30Days: number;
  runningDays: number | null;
  verdict: OfferScaleVerdict;
  verdictLabel: string;
  verdictBody: string;
  months: OfferScaleMonth[];
  pages: OfferScalePage[];
  sample: OfferScaleSample[];
  proxy: string | null;
};

const DAY_MS = 86_400_000;

function toTime(iso: string | null) {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  return Number.isNaN(t) ? null : t;
}

function daysAgo(iso: string | null, now: number) {
  const t = toTime(iso);
  if (t == null) return null;
  return Math.floor((now - t) / DAY_MS);
}

function formatDate(iso: string | null) {
  const t = toTime(iso);
  if (t == null) return "";
  return new Date(t).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function monthKey(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(month: string) {
  const date = new Date(`${month}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return month;
  return date.toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function minIso(values: Array<string | null>) {
  const times = values
    .map((iso) => ({ iso, t: toTime(iso) }))
    .filter((item): item is { iso: string; t: number } => Boolean(item.iso) && item.t != null);
  if (!times.length) return null;
  return times.reduce((best, item) => (item.t < best.t ? item : best)).iso;
}

function maxIso(values: Array<string | null>) {
  const times = values
    .map((iso) => ({ iso, t: toTime(iso) }))
    .filter((item): item is { iso: string; t: number } => Boolean(item.iso) && item.t != null);
  if (!times.length) return null;
  return times.reduce((best, item) => (item.t > best.t ? item : best)).iso;
}

function countSince(ads: MetaAd[], now: number, days: number) {
  const from = now - days * DAY_MS;
  return ads.filter((ad) => {
    const t = toTime(ad.startDate);
    return t != null && t >= from;
  }).length;
}

export function decideOfferScale(input: {
  volume: number;
  last14Days: number;
  newestAgeDays: number | null;
}): { verdict: OfferScaleVerdict; label: string } {
  const { volume, last14Days, newestAgeDays } = input;
  if (volume <= 0) return { verdict: "none", label: "Sem anúncios" };
  if (volume <= 7) return { verdict: "testing", label: "Em teste" };
  if (newestAgeDays != null && newestAgeDays > 45) {
    return { verdict: "mature", label: "Rodando, sem criativo novo" };
  }
  if (volume >= 20) return { verdict: "scaling", label: "Escalando" };
  if (volume >= 12 && last14Days >= 2) {
    return { verdict: "scaling", label: "Escalando" };
  }
  if (volume >= 8) return { verdict: "validated", label: "Oferta validada" };
  return { verdict: "testing", label: "Em teste" };
}

function buildBody(input: {
  verdict: OfferScaleVerdict;
  volume: number;
  adCount: number;
  uniquePages: number;
  oldestStart: string | null;
  newestStart: string | null;
  last7Days: number;
  last14Days: number;
  runningDays: number | null;
}) {
  const pages = `${input.uniquePages} página${input.uniquePages === 1 ? "" : "s"}`;
  const volumeBit =
    input.volume > input.adCount
      ? `${input.adCount} anúncios na primeira página (Meta indica ${input.volume} no total)`
      : `${input.volume} anúncio${input.volume === 1 ? "" : "s"} ativo${input.volume === 1 ? "" : "s"}`;
  const oldest = formatDate(input.oldestStart);
  const newest = formatDate(input.newestStart);
  const age =
    oldest && newest
      ? `O mais antigo começou em ${oldest}; o mais novo em ${newest}.`
      : oldest
        ? `Começou em ${oldest}.`
        : "";
  const recency = `Nos últimos 7 dias: ${input.last7Days} criativo(s); em 14 dias: ${input.last14Days}.`;
  const run =
    input.runningDays != null
      ? `Há ${input.runningDays} dia${input.runningDays === 1 ? "" : "s"} no ar.`
      : "";

  if (input.verdict === "none") {
    return "Nenhum anúncio ativo com esse tema na Biblioteca da Meta.";
  }
  if (input.verdict === "testing") {
    return `${volumeBit} de ${pages}. Pouca variação de criativo — ainda parece teste. ${age} ${recency}`.trim();
  }
  if (input.verdict === "validated") {
    return `${volumeBit} de ${pages}. Já passou do teste: tem volume para validar a oferta. ${age} ${run} ${recency}`.trim();
  }
  if (input.verdict === "scaling") {
    const recencyBit =
      input.last14Days >= 2
        ? "Volume alto e criativo recente = oferta validada e em escala."
        : "Volume alto na biblioteca = oferta validada e em escala no mercado.";
    return `${volumeBit} de ${pages}. ${recencyBit} ${age} ${run} ${recency}`.trim();
  }
  return `${volumeBit} de ${pages}. Teve escala, mas o último criativo é antigo — pode ter parado de lançar. ${age} ${run} ${recency}`.trim();
}

export function summarizeOfferScale(input: {
  keywords: string;
  country: string;
  ads: MetaAd[];
  libraryTotal?: number | null;
  proxy?: string | null;
  now?: number;
}): OfferScaleReport {
  const now = input.now ?? Date.now();
  const ads = input.ads;
  const oldestStart = minIso(ads.map((ad) => ad.startDate));
  const newestStart = maxIso(ads.map((ad) => ad.startDate));
  const last7Days = countSince(ads, now, 7);
  const last14Days = countSince(ads, now, 14);
  const last30Days = countSince(ads, now, 30);
  const runningDays = daysAgo(oldestStart, now);
  const newestAgeDays = daysAgo(newestStart, now);
  const pagesMap = new Map<string, OfferScalePage>();
  for (const ad of ads) {
    const name = ad.pageName || "Página";
    const prev = pagesMap.get(name);
    if (!prev) {
      pagesMap.set(name, {
        pageName: name,
        count: 1,
        oldestStart: ad.startDate,
        newestStart: ad.startDate,
      });
      continue;
    }
    prev.count += 1;
    prev.oldestStart = minIso([prev.oldestStart, ad.startDate]);
    prev.newestStart = maxIso([prev.newestStart, ad.startDate]);
  }
  const pages = [...pagesMap.values()].sort((a, b) => b.count - a.count || a.pageName.localeCompare(b.pageName, "pt-BR"));
  const monthsMap = new Map<string, number>();
  for (const ad of ads) {
    if (!ad.startDate) continue;
    const key = monthKey(ad.startDate);
    if (!key) continue;
    monthsMap.set(key, (monthsMap.get(key) ?? 0) + 1);
  }
  const months = [...monthsMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, label: monthLabel(month), count }));
  const sample = [...ads]
    .sort((a, b) => (toTime(b.startDate) ?? 0) - (toTime(a.startDate) ?? 0))
    .slice(0, 40)
    .map((ad) => ({
      id: ad.id,
      pageName: ad.pageName,
      title: ad.title,
      startDate: ad.startDate,
      endDate: ad.endDate,
      snapshotUrl: ad.snapshotUrl,
    }));
  const adCount = ads.length;
  const uniquePages = pages.length;
  const volume = Math.max(input.libraryTotal ?? 0, adCount);
  const decided = decideOfferScale({
    volume,
    last14Days,
    newestAgeDays,
  });
  return {
    keywords: input.keywords.trim(),
    country: input.country.trim() || "BR",
    adCount,
    libraryTotal: input.libraryTotal ?? (adCount || null),
    uniquePages,
    oldestStart,
    newestStart,
    last7Days,
    last14Days,
    last30Days,
    runningDays,
    verdict: decided.verdict,
    verdictLabel: decided.label,
    verdictBody: buildBody({
      verdict: decided.verdict,
      volume,
      adCount,
      uniquePages,
      oldestStart,
      newestStart,
      last7Days,
      last14Days,
      runningDays,
    }),
    months,
    pages: pages.slice(0, 20),
    sample,
    proxy: input.proxy ?? null,
  };
}
