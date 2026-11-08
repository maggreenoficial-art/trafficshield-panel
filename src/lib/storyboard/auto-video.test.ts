import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAutoVideoPrompt,
  parseAutoVideoPlan,
  resolveSpokenLanguage,
} from "./auto-video";

test("lê o JSON dos três prompts", () => {
  const plan = parseAutoVideoPlan(`\`\`\`json
{"imagePrompt":"Still frame","take1":"She says \\"hola\\"","take2":"She points down"}
\`\`\``);
  assert.equal(plan.imagePrompt, "Still frame");
  assert.match(plan.take1, /hola/);
  assert.equal(plan.take2, "She points down");
});

test("recusa plano incompleto", () => {
  assert.throws(() => parseAutoVideoPlan('{"imagePrompt":"só a foto"}'));
});

test("idioma da fala segue o pedido", () => {
  assert.equal(resolveSpokenLanguage("gera em inglês").label, "inglês");
  assert.equal(
    resolveSpokenLanguage("speak in english about the product").label,
    "inglês"
  );
  assert.equal(
    resolveSpokenLanguage("fala em português do produto").label,
    "português brasileiro"
  );
  assert.equal(resolveSpokenLanguage("anúncio do produto").label, "espanhol mexicano");
  assert.match(buildAutoVideoPrompt("video in english"), /Idioma da fala: inglês/);
});
