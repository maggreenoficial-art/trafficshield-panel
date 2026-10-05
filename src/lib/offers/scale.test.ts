import assert from "node:assert/strict";
import test from "node:test";
import { decideOfferScale, SCALE_AD_THRESHOLD, summarizeOfferScale } from "./scale";
import type { MetaAd } from "./types";

const NOW = Date.parse("2026-10-05T12:00:00.000Z");

function ad(partial: Partial<MetaAd> & Pick<MetaAd, "id" | "pageName" | "startDate">): MetaAd {
  return {
    pageId: null,
    body: "",
    title: null,
    cta: null,
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

test("escala só a partir de 20 anúncios relevantes", () => {
  assert.equal(
    decideOfferScale({ volume: 19, newestAgeDays: 2 }).verdict,
    "validated"
  );
  assert.equal(
    decideOfferScale({ volume: SCALE_AD_THRESHOLD, newestAgeDays: 2 }).verdict,
    "scaling"
  );
});

test("poucos anúncios ainda são teste", () => {
  assert.equal(decideOfferScale({ volume: 4, newestAgeDays: 1 }).verdict, "testing");
});

test("volume médio sem 20 anúncios não escala", () => {
  assert.equal(decideOfferScale({ volume: 10, newestAgeDays: 10 }).verdict, "validated");
});

test("volume sem criativo novo fica maduro", () => {
  assert.equal(decideOfferScale({ volume: 40, newestAgeDays: 80 }).verdict, "mature");
});

test("o veredito usa só os anúncios filtrados, não o total bruto da Meta", () => {
  const ads = [];
  for (let i = 1; i <= 14; i++) {
    ads.push(
      ad({
        id: String(i),
        pageName: i < 5 ? "Página A" : "Página C",
        startDate: "2026-09-26T00:00:00.000Z",
        pageId: String(i),
      })
    );
  }
  const report = summarizeOfferScale({
    keywords: "emagrecer",
    country: "BR",
    ads,
    rawCount: 29,
    libraryTotal: 180,
    now: NOW,
  });
  assert.equal(report.adCount, 14);
  assert.equal(report.rawCount, 29);
  assert.equal(report.dropped, 15);
  assert.equal(report.verdict, "validated");
  assert.ok(report.verdictBody.includes("20"));
});
