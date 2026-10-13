import assert from "node:assert/strict";
import test from "node:test";
import { parseReportUrls } from "./urls";

test("aceita URL e domínio solto, sem repetir", () => {
  const urls = parseReportUrls(
    "https://falso.exemplo.com/login\nhttps://falso.exemplo.com/login\n# comentario"
  );
  assert.deepEqual(urls, ["https://falso.exemplo.com/login"]);
});

test("ignora o próprio painel e localhost", () => {
  const urls = parseReportUrls("https://www.norat.cloud/ofertas\nhttp://localhost/x\nhttps://site-falso.exemplo.com/p");
  assert.deepEqual(urls, ["https://site-falso.exemplo.com/p"]);
});
