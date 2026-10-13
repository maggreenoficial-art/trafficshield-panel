import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFeedTitle,
  FEED_MAX_WORDS,
  formatFeedHeadline,
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

test("a tag urgente só entra em acidente, crime, morte, desastre, falta de água ou luz e alerta de saúde", () => {
  assert.equal(isUrgentNews("Prefeitura instala novos contêineres de lixo"), false);
  assert.equal(isUrgentNews("Acidente deixa feridos na BR-158"), true);
  assert.equal(isUrgentNews("Falta de água atinge o Jardim Alvorada"), true);
  assert.equal(isUrgentNews("Alerta de saúde para surto de dengue"), true);
  assert.equal(isUrgentNews("Show na praça reúne famílias"), false);
});
