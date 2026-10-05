import {
  detectOfferNiches,
  looksLikeInfoProduct,
  looksLikeJunkAd,
} from "@/lib/offers/niche";
import type { OfferSearchPlan } from "@/lib/offers/search-plan";
import { foldText, tokenize } from "@/lib/offers/text";
import type { MetaAd } from "@/lib/offers/types";

function haystack(ad: MetaAd) {
  return foldText(
    [ad.pageName, ad.title ?? "", ad.body, ad.cta ?? "", ad.linkUrl ?? ""].join(" ")
  );
}

export function scoreAdAgainstPlan(ad: MetaAd, plan: OfferSearchPlan): number {
  const hay = haystack(ad);
  if (!hay) return 0;
  let score = 0;
  const niches = detectOfferNiches(hay);
  if (niches.length) score += 4 * niches.length;
  if (looksLikeInfoProduct(hay)) score += 5;
  if (looksLikeJunkAd(hay)) score -= 12;
  for (const token of plan.must) {
    const folded = foldText(token);
    if (folded && hay.includes(folded)) score += 3;
  }
  for (const token of tokenize(`${plan.query} ${plan.aliases.join(" ")}`)) {
    if (hay.includes(token)) score += 1;
  }
  for (const token of plan.drop) {
    const folded = foldText(token);
    if (folded && hay.includes(folded)) score -= 6;
  }
  return score;
}

export function prefilterAdsForReview(
  ads: MetaAd[],
  plan: OfferSearchPlan
): { review: MetaAd[]; drop: MetaAd[] } {
  const review: MetaAd[] = [];
  const drop: MetaAd[] = [];
  for (const ad of ads) {
    const hay = haystack(ad);
    if (looksLikeJunkAd(hay) && !looksLikeInfoProduct(hay)) {
      drop.push(ad);
      continue;
    }
    review.push(ad);
  }
  const ranked = [...review].sort(
    (a, b) => scoreAdAgainstPlan(b, plan) - scoreAdAgainstPlan(a, plan)
  );
  return {
    review: ranked.slice(0, 48),
    drop: [...drop, ...ranked.slice(48)],
  };
}

export function filterAdsByPlan(ads: MetaAd[], plan: OfferSearchPlan): {
  keep: MetaAd[];
  drop: MetaAd[];
} {
  const keep: MetaAd[] = [];
  const drop: MetaAd[] = [];
  for (const ad of ads) {
    const hay = haystack(ad);
    const junk = looksLikeJunkAd(hay);
    const niche = detectOfferNiches(hay).length > 0;
    const product = looksLikeInfoProduct(hay);
    const score = scoreAdAgainstPlan(ad, plan);
    if (junk && !product) {
      drop.push(ad);
      continue;
    }
    if (score >= 3 || niche || product) keep.push(ad);
    else drop.push(ad);
  }
  return { keep, drop };
}
