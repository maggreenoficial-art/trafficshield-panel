import assert from "node:assert/strict";
import test from "node:test";
import { buildPhishingTitles, defangHost } from "./titles";

test("o título segue o print: domínio com ponto trocado e a frase de phishing", () => {
  assert.equal(defangHost("RuasDeVerdade.com"), "ruasdeverdade[.]com");
  const titles = buildPhishingTitles("https://ruasdeverdade.com/", 1000);
  assert.equal(titles.length, 1000);
  assert.equal(new Set(titles).size, 1000);
  assert.equal(titles[0], "ruasdeverdade[.]com hosts a page that asks visitors to send a Pix");
  assert.equal(titles[1], "ruasdeverdade[.]com collects payment through a Pix form");
  for (const title of titles) {
    assert.match(title, /^ruasdeverdade\[\.\]com /);
  }
});
