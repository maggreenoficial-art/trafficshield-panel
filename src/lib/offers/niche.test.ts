import assert from "node:assert/strict";
import test from "node:test";
import {
  detectOfferNiches,
  isExplicitlyOutOfScope,
  keywordsMatchNiche,
} from "./niche";

test("reconhece o recorte cristão e família", () => {
  assert.ok(keywordsMatchNiche("curso família cristã"));
  assert.ok(detectOfferNiches("mentoria para pais evangélicos").includes("evangelico"));
  assert.equal(isExplicitlyOutOfScope("emagrecer"), true);
  assert.equal(keywordsMatchNiche("implante dentário"), false);
});
