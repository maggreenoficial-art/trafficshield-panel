import assert from "node:assert/strict";
import test from "node:test";
import { decideOfferScale, summarizeOfferScale } from "./scale";
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

test("volume alto e criativo recente é escala", () => {
  const decided = decideOfferScale({ volume: 29, last14Days: 8, newestAgeDays: 2 });
  assert.equal(decided.verdict, "scaling");
});

test("poucos anúncios ainda são teste", () => {
  const decided = decideOfferScale({ volume: 4, last14Days: 4, newestAgeDays: 1 });
  assert.equal(decided.verdict, "testing");
});

test("volume médio sem explosão recente ainda valida a oferta", () => {
  const decided = decideOfferScale({ volume: 10, last14Days: 1, newestAgeDays: 10 });
  assert.equal(decided.verdict, "validated");
});

test("volume sem criativo novo fica maduro", () => {
  const decided = decideOfferScale({ volume: 40, last14Days: 0, newestAgeDays: 80 });
  assert.equal(decided.verdict, "mature");
});

test("volume de biblioteca alto com criativo recente é escala", () => {
  const ads = [
    ad({
      id: "1",
      pageName: "Página A",
      startDate: "2026-03-01T00:00:00.000Z",
      title: "Antigo",
    }),
    ad({
      id: "2",
      pageName: "Página A",
      startDate: "2026-10-01T00:00:00.000Z",
      title: "Novo",
    }),
    ad({
      id: "3",
      pageName: "Página B",
      startDate: "2026-09-28T00:00:00.000Z",
    }),
  ];
  for (let i = 4; i <= 14; i++) {
    ads.push(
      ad({
        id: String(i),
        pageName: "Página C",
        startDate: "2026-09-26T00:00:00.000Z",
      })
    );
  }
  const report = summarizeOfferScale({
    keywords: "emagrecer",
    country: "BR",
    ads,
    libraryTotal: 180,
    now: NOW,
  });
  assert.equal(report.adCount, 14);
  assert.equal(report.libraryTotal, 180);
  assert.equal(report.uniquePages, 3);
  assert.equal(report.verdict, "scaling");
  assert.equal(report.oldestStart, "2026-03-01T00:00:00.000Z");
  assert.equal(report.newestStart, "2026-10-01T00:00:00.000Z");
  assert.ok(report.last14Days >= 2);
  assert.ok(report.verdictBody.includes("180"));
  assert.equal(report.pages[0].pageName, "Página C");
});
