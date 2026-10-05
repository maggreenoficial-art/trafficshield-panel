import assert from "node:assert/strict";
import test from "node:test";
import { filterAdsByPlan, scoreAdAgainstPlan } from "./relevance";
import { fallbackOfferSearchPlan } from "./search-plan";
import type { MetaAd } from "./types";

function ad(partial: Partial<MetaAd> & Pick<MetaAd, "id">): MetaAd {
  return {
    pageName: "Página",
    pageId: null,
    body: "",
    title: null,
    cta: null,
    startDate: null,
    endDate: null,
    isActive: true,
    imageUrl: null,
    videoUrl: null,
    snapshotUrl: `https://www.facebook.com/ads/library/?id=${partial.id}`,
    linkUrl: null,
    platforms: ["FACEBOOK"],
    ...partial,
  };
}

test("tira vaga e fica com o infoproduto cristão", () => {
  const plan = fallbackOfferSearchPlan("curso família cristã");
  const offer = ad({
    id: "1",
    pageName: "Família na Fé",
    title: "Curso família cristã",
    body: "Mentoria para pais evangélicos. Inscrição na Kiwify.",
  });
  const job = ad({
    id: "2",
    pageName: "RH Igreja",
    title: "Vaga de emprego para secretária",
    body: "Contratamos CLT. Envie currículo.",
  });
  const { keep, drop } = filterAdsByPlan([offer, job], plan);
  assert.equal(keep.length, 1);
  assert.equal(keep[0].id, "1");
  assert.equal(drop[0].id, "2");
  assert.ok(scoreAdAgainstPlan(offer, plan) > scoreAdAgainstPlan(job, plan));
});
