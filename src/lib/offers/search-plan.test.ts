import assert from "node:assert/strict";
import test from "node:test";
import { parseOfferSearchPlan, fallbackOfferSearchPlan } from "./search-plan";

test("lê o plano de busca do Grok no recorte", () => {
  const plan = parseOfferSearchPlan(
    JSON.stringify({
      inNiche: true,
      intent: "curso de família cristã pago",
      query: "curso família cristã",
      aliases: ["formação evangélica"],
      must: ["curso", "família"],
      drop: ["vaga", "emprego"],
      niches: ["cristao", "familias"],
    }),
    "curso família cristã"
  );
  assert.equal(plan.source, "grok");
  assert.equal(plan.inNiche, true);
  assert.equal(plan.query, "curso família cristã");
  assert.ok(plan.must.includes("curso"));
  assert.ok(plan.drop.includes("vaga"));
  assert.ok(plan.niches.includes("cristao"));
});

test("emagrecer fica fora do recorte mesmo se o JSON vier frouxo", () => {
  const plan = parseOfferSearchPlan(
    JSON.stringify({
      inNiche: true,
      query: "desafio emagrecer 30 dias",
      niches: ["familias"],
    }),
    "emagrecer"
  );
  assert.equal(plan.inNiche, false);
  assert.ok(plan.outOfNicheReason);
});

test("cai no tema do usuário se o JSON vier quebrado", () => {
  const plan = parseOfferSearchPlan("não é json", "curso família cristã");
  assert.equal(plan.source, "fallback");
  assert.equal(plan.query, "curso família cristã");
  assert.equal(plan.inNiche, true);
});

test("caça aberta usa as frases do recorte", () => {
  const plan = fallbackOfferSearchPlan("", true);
  assert.equal(plan.hunt, true);
  assert.equal(plan.inNiche, true);
  assert.ok(plan.aliases.length >= 3);
});
