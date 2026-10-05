import {
  isWatchedPage,
  listWatchedOfferPages,
  upsertWatchedOfferPage,
  type WatchedOfferPage,
} from "@/lib/db/offer-watch";
import { nicheLabelList, type OfferNicheId } from "@/lib/offers/niche";
import { prefilterAdsForReview } from "@/lib/offers/relevance";
import { reviewAdsWithGrok, synthesizeOfferHunt } from "@/lib/offers/review";
import { scrapeMetaAdQueries, type AdLibrarySearchType } from "@/lib/offers/scrape";
import { planOfferSearch, type OfferSearchPlan } from "@/lib/offers/search-plan";
import {
  SCALE_AD_THRESHOLD,
  summarizeOfferScale,
  type OfferScaleReport,
} from "@/lib/offers/scale";
import type { OfferProxy } from "@/lib/offers/proxy-parse";
import type { MetaAd, OfferMediaType } from "@/lib/offers/types";

export type OfferSearchResult = {
  plan: OfferSearchPlan;
  ads: MetaAd[];
  rawCount: number;
  dropped: number;
  proxy: string | null;
  total: number | null;
  report: OfferScaleReport;
  watched: WatchedOfferPage[];
  autoWatched: WatchedOfferPage[];
  brief: string;
};

function watchKey(pageId: string | null, pageName: string) {
  return (pageId || pageName).trim().toLowerCase();
}

function emptyReport(input: {
  keywords: string;
  country: string;
  plan: OfferSearchPlan;
  proxy?: string | null;
}): OfferScaleReport {
  const report = summarizeOfferScale({
    keywords: input.keywords,
    country: input.country,
    ads: [],
    rawCount: 0,
    libraryTotal: 0,
    intent: input.plan.intent,
    query: input.plan.query,
    proxy: input.proxy ?? null,
    brief: "",
    niches: input.plan.niches,
    inNiche: input.plan.inNiche,
    outOfNicheReason: input.plan.outOfNicheReason,
  });
  if (!input.plan.inNiche) {
    report.verdictLabel = "Fora do recorte";
    report.verdictBody =
      input.plan.outOfNicheReason ||
      "Só caçamos produtos e infoprodutos de direita, conservador, evangélico, cristão, patriota e famílias.";
  }
  return report;
}

async function autoWatchGoodOffer(input: {
  ads: MetaAd[];
  report: OfferScaleReport;
  keywords: string;
  country: string;
  watchKeys: Set<string>;
}): Promise<WatchedOfferPage[]> {
  const byPage = new Map<string, MetaAd[]>();
  for (const ad of input.ads) {
    const key = watchKey(ad.pageId, ad.pageName);
    const list = byPage.get(key) ?? [];
    list.push(ad);
    byPage.set(key, list);
  }
  const added: WatchedOfferPage[] = [];
  for (const [key, group] of byPage) {
    const lead = group[0];
    const reviews = group.map((ad) => ad.review).filter(Boolean);
    const grokWatch =
      input.watchKeys.has(key) ||
      input.watchKeys.has(lead.pageName.toLowerCase()) ||
      reviews.some((item) => item && item.watch && item.score >= 7);
    const strongPage =
      group.length >= 2 && reviews.filter((item) => item && item.score >= 6).length >= 2;
    const scaling = input.report.verdict === "scaling" && group.length >= 2;
    if (!grokWatch && !strongPage && !scaling) continue;
    const niches = [
      ...new Set(reviews.flatMap((item) => (item ? item.niches : []))),
    ] as OfferNicheId[];
    const why =
      reviews.find((item) => item?.watch && item.why)?.why ||
      reviews.find((item) => item?.why)?.why ||
      `Oferta do recorte${niches.length ? ` (${nicheLabelList(niches)})` : ""}${
        input.report.verdict === "scaling"
          ? ` · ${input.report.adCount} anúncios relevantes, piso ${SCALE_AD_THRESHOLD}`
          : ""
      }.`;
    const pages = await upsertWatchedOfferPage({
      pageId: lead.pageId,
      pageName: lead.pageName,
      keywords: input.keywords,
      country: input.country,
      adCount: group.length,
      linkUrl: group.find((ad) => ad.linkUrl)?.linkUrl ?? null,
      snapshotUrl: lead.snapshotUrl,
      reason: why,
    });
    const latest = pages[0];
    if (latest) added.push(latest);
  }
  return added;
}

export async function searchOfferLibrary(input: {
  keywords: string;
  country: string;
  mediaType: OfferMediaType;
  proxies: OfferProxy[];
  hunt?: boolean;
}): Promise<OfferSearchResult> {
  const hunt = Boolean(input.hunt) || !input.keywords.trim();
  const keywords = input.keywords.trim();
  const country = input.country.trim() || "BR";
  const plan = await planOfferSearch({ keywords, country, hunt });
  const empty = (): OfferSearchResult => ({
    plan,
    ads: [],
    rawCount: 0,
    dropped: 0,
    proxy: null,
    total: null,
    report: emptyReport({ keywords: keywords || plan.query, country, plan }),
    watched: [],
    autoWatched: [],
    brief: "",
  });

  if (!plan.inNiche) {
    const watched = await listWatchedOfferPages();
    return { ...empty(), watched };
  }

  const queries: { keywords: string; searchType: AdLibrarySearchType }[] = [
    { keywords: plan.query, searchType: "keyword_exact_phrase" },
    { keywords: plan.query, searchType: "keyword_unordered" },
    ...plan.aliases.map((alias) => ({
      keywords: alias,
      searchType: "keyword_unordered" as const,
    })),
  ];
  if (!hunt && keywords && plan.query.toLowerCase() !== keywords.toLowerCase()) {
    queries.push({ keywords, searchType: "keyword_unordered" });
  }
  const scraped = await scrapeMetaAdQueries({
    queries,
    country,
    mediaType: input.mediaType,
    proxies: input.proxies,
  });
  const lexical = prefilterAdsForReview(scraped.ads, plan);
  const reviewed = await reviewAdsWithGrok(
    lexical.review.length ? lexical.review : scraped.ads,
    plan
  );
  const synth = await synthesizeOfferHunt({ plan, ads: reviewed.ads });
  const ads = reviewed.ads;
  const watched = await listWatchedOfferPages();
  const watching = new Set(
    watched.flatMap((page) => [
      watchKey(page.pageId, page.pageName),
      page.pageName.toLowerCase(),
    ])
  );
  const report = summarizeOfferScale({
    keywords: keywords || plan.query,
    country,
    ads,
    rawCount: scraped.ads.length,
    libraryTotal: scraped.total,
    intent: plan.intent,
    query: plan.query,
    watching,
    proxy: scraped.proxy,
    brief: synth.brief,
    niches: plan.niches,
    inNiche: plan.inNiche,
    outOfNicheReason: plan.outOfNicheReason,
  });
  if (synth.brief) {
    report.verdictBody = `${synth.brief} ${report.verdictBody}`.trim();
  }
  const autoWatched = await autoWatchGoodOffer({
    ads,
    report,
    keywords: keywords || plan.query,
    country,
    watchKeys: new Set(synth.watchKeys),
  });
  const nextWatched = autoWatched.length ? await listWatchedOfferPages() : watched;
  if (autoWatched.length) {
    const keys = new Set(
      nextWatched.flatMap((page) => [
        watchKey(page.pageId, page.pageName),
        page.pageName.toLowerCase(),
      ])
    );
    for (const page of report.pages) {
      page.watching = isWatchedPage(nextWatched, page) || keys.has(page.pageName.toLowerCase());
    }
  }
  return {
    plan,
    ads,
    rawCount: scraped.ads.length,
    dropped: Math.max(0, scraped.ads.length - ads.length),
    proxy: scraped.proxy,
    total: scraped.total,
    report,
    watched: nextWatched,
    autoWatched,
    brief: synth.brief,
  };
}
