import assert from "node:assert/strict";
import test from "node:test";
import { fallbackKeywordHunt, parseKeywordHunt } from "./keywords";

test("sem nome devolve um banco do recorte para pesquisar", () => {
  const hunt = fallbackKeywordHunt("");
  assert.equal(hunt.inNiche, true);
  assert.ok(hunt.keywords.length >= 8);
  assert.ok(hunt.keywords.some((item) => item.niche === "cristao"));
  assert.ok(hunt.keywords.some((item) => item.niche === "patriota"));
});

test("emagrecer não vira lista de busca", () => {
  const hunt = fallbackKeywordHunt("emagrecer");
  assert.equal(hunt.inNiche, false);
  assert.equal(hunt.keywords.length, 0);
});

test("lê as frases que o Grok montou", () => {
  const hunt = parseKeywordHunt(
    JSON.stringify({
      inNiche: true,
      keywords: [
        { phrase: "curso família cristã", niche: "cristao", why: "Oferta paga." },
        { phrase: "método patriota", niche: "patriota", why: "Infoproduto." },
        { phrase: "curso família cristã", niche: "cristao", why: "duplicata" },
      ],
    }),
    "família"
  );
  assert.equal(hunt.source, "grok");
  assert.equal(hunt.keywords.length, 2);
  assert.equal(hunt.keywords[0].phrase, "curso família cristã");
});
