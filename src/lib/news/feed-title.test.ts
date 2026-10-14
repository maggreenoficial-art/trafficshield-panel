import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFeedTitle,
  artLayerResolution,
  composeFeedImagePrompt,
  promptWithoutArtLayerMark,
  FEED_MAX_WORDS,
  formatFeedHeadline,
  HEADLINE_EDITOR_RULE,
  HEADLINE_RED_RULE,
  HEADLINE_SPECIFIC_RULE,
  HEADLINE_VERB_RULE,
  isUrgentNews,
} from "./feed-title";

test("o título do exemplo fica em caixa alta, com o fato em vermelho e no máximo 9 palavras", () => {
  const words = buildFeedTitle(
    "Prefeitura instala [novos contêineres] de lixo no Jardim Campo Grande."
  );
  assert.equal(words.length <= FEED_MAX_WORDS, true);
  assert.equal(words.length, 10);
  assert.equal(
    formatFeedHeadline(words),
    "PREFEITURA INSTALA [NOVOS CONTÊINERES] DE LIXO NO JARDIM CAMPO GRANDE"
  );
  assert.deepEqual(
    words.filter((word) => word.red).map((word) => word.text),
    ["NOVOS", "CONTÊINERES"]
  );
});

test("artigo, preposição e conector não ficam em vermelho", () => {
  const words = buildFeedTitle("Prefeitura anuncia [a festa com] shows");
  assert.deepEqual(
    words.filter((word) => word.red).map((word) => word.text),
    ["FESTA"]
  );
});

test("o prompt manda o título exato, as palavras em vermelho e omite a tag quando não é urgente", () => {
  const prompt = composeFeedImagePrompt({
    headline: "Prefeitura instala [novos contêineres] de lixo no Jardim Campo Grande.",
    urgent: false,
    hasPhoto: true,
  });
  assert.match(prompt, /1080x1080/);
  assert.match(
    prompt,
    /"PREFEITURA INSTALA NOVOS CONTÊINERES DE LIXO NO JARDIM CAMPO GRANDE"/
  );
  assert.match(prompt, /"NOVOS CONTÊINERES"/);
  assert.match(prompt, /Do not write URGENTE/);
  assert.match(prompt, /Do not draw any photo, person, place or object/);
  assert.match(prompt, /From y = 0 to 704: fully transparent except the logo and the tag/);
  assert.match(prompt, /Do NOT draw any gradient/);
  assert.match(prompt, /RED BAR: #D7141A, 180x10px, at x = 60, y = 720/);
  assert.match(prompt, /Exactly 3 lines/);
  assert.match(prompt, /Never leave a single word alone on the last line/);
  assert.match(prompt, /NO glow, shadow or outline/);
  assert.match(prompt, /"@informacassilandia" centered at y = 1032/);
  assert.doesNotMatch(prompt, /Reference 3/);
  assert.doesNotMatch(prompt, /FULL WIDTH/);
  assert.doesNotMatch(prompt, /align it to the top/);
  assert.match(promptWithoutArtLayerMark(prompt), /^Transparent PNG, exactly 1080x1080/);
  assert.equal(artLayerResolution(prompt, "4K"), "1K");
  assert.equal(artLayerResolution(prompt, "2K"), "2K");
});

test("a regra do título pede português natural e não deixa apagar conectores", () => {
  assert.match(HEADLINE_EDITOR_RULE, /nunca escreva em estilo telegrama/);
  assert.match(HEADLINE_EDITOR_RULE, /nunca o que é removido do texto/);
  assert.match(HEADLINE_VERB_RULE, /nunca "inicia contêineres"/);
  assert.match(HEADLINE_SPECIFIC_RULE, /nunca podem ficar sozinhas/);
  assert.match(HEADLINE_RED_RULE, /trecho contínuo/);
});

test("o vermelho pinta o trecho inteiro, inclusive o de no meio", () => {
  const words = buildFeedTitle("PROJETO-PILOTO INSTALA [CONTÊINERES DE LIXO] NO JARDIM CAMPO GRANDE");
  assert.equal(
    formatFeedHeadline(words),
    "PROJETO-PILOTO INSTALA [CONTÊINERES DE LIXO] NO JARDIM CAMPO GRANDE"
  );
});

test("a tag urgente só entra em acidente, crime, morte, desastre, falta de água ou luz e alerta de saúde", () => {
  assert.equal(isUrgentNews("Prefeitura instala novos contêineres de lixo"), false);
  assert.equal(isUrgentNews("Acidente deixa feridos na BR-158"), true);
  assert.equal(isUrgentNews("Falta de água atinge o Jardim Alvorada"), true);
  assert.equal(isUrgentNews("Alerta de saúde para surto de dengue"), true);
  assert.equal(isUrgentNews("Show na praça reúne famílias"), false);
});
