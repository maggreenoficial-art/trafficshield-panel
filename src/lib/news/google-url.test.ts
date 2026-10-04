import assert from "node:assert/strict";
import test from "node:test";
import {
  googleNewsArticleId,
  normalizePublisherUrl,
  parseGoogleNewsBatchexecute,
  parseGoogleNewsSignature,
} from "./google-url";

test("lê o id da matéria no Google News", () => {
  const id =
    "CBMiswFBVV95cUxQYUxTeC1PR1A2UVFiYklZcXlvLXZMa2dDTklQZmIyT1NYWWNITk5wams5cEFoX2o1eFd3NFpIcUtlZUFnSEpScEt5UlJtTFlwQUhvOUFmUlNlaUM1UnZHWXJ6Y3ZBaFMycnl5YjNBaXNaS01CcDQtMWNhZTA0R3l5VFNoRldSaVNWc1hWMW4xd3oxWmN1OUVoakdkNEVjcE5YS1hTRHprTnF0OE04LV96NHhaZw";
  assert.equal(
    googleNewsArticleId(
      `https://news.google.com/rss/articles/${id}?hl=pt-BR&gl=BR&ceid=BR:pt-419`
    ),
    id
  );
  assert.equal(
    googleNewsArticleId(`https://news.google.com/articles/${id}`),
    id
  );
  assert.equal(googleNewsArticleId("https://midiamax.com.br/policia/materia"), null);
});

test("tira o subdomínio AMP da URL da fonte", () => {
  assert.equal(
    normalizePublisherUrl("https://amp.campograndenews.com.br/cidades/interior/materia"),
    "https://www.campograndenews.com.br/cidades/interior/materia"
  );
});

test("lê assinatura e timestamp da página do Google News", () => {
  const parsed = parseGoogleNewsSignature(
    `<div data-n-a-ts="1791134051" data-n-a-sg="AbIaSL8jGre-nj0XrUNloBSSc0gc"></div>`
  );
  assert.equal(parsed?.timestamp, "1791134051");
  assert.equal(parsed?.signature, "AbIaSL8jGre-nj0XrUNloBSSc0gc");
});

test("lê a URL da fonte no batchexecute", () => {
  const decoded = parseGoogleNewsBatchexecute(
    String.raw`)]}'

[["wrb.fr","Fbv4je","[\"garturlres\",\"https://midiamax.com.br/policia/materia/\",1]",null,null,null,"7"],["di",13]]`
  );
  assert.equal(decoded.get("7"), "https://midiamax.com.br/policia/materia/");
});
