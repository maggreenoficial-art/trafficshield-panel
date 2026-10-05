import assert from "node:assert/strict";
import test from "node:test";
import { parseAdReviews } from "./review";

test("keep vazio do Grok não vira lista cheia", () => {
  const reviews = parseAdReviews(JSON.stringify({ reviews: [] }));
  assert.equal(reviews.length, 0);
});

test("só fica oferta do recorte com produto", () => {
  const reviews = parseAdReviews(
    JSON.stringify({
      reviews: [
        {
          id: "1",
          keep: true,
          niches: ["cristao", "familias"],
          productType: "infoproduto",
          score: 8,
          watch: true,
          why: "Curso pago de família cristã.",
        },
        {
          id: "2",
          keep: true,
          niches: [],
          productType: "none",
          score: 2,
          watch: false,
          why: "Culto ao vivo.",
        },
      ],
    })
  );
  assert.equal(reviews.filter((item) => item.keep).length, 1);
  assert.equal(reviews[0].id, "1");
  assert.equal(reviews[0].watch, true);
  assert.equal(reviews[1].keep, false);
});
