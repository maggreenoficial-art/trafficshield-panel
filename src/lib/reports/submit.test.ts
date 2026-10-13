import assert from "node:assert/strict";
import test from "node:test";
import { cloudflareReportBody, googleReportBody } from "./submit";

test("o corpo do Google leva a URL e a nota, sem vazar HTML cru", () => {
  const body = JSON.parse(googleReportBody("https://falso.exemplo.com/p", "copia <script>"));
  assert.equal(body[0], "https://falso.exemplo.com/p");
  assert.match(body[3], /copia &lt;script&gt;/);
});

test("Cloudflare recebe o site e o e-mail de quem denuncia", () => {
  const cf = cloudflareReportBody({
    url: "https://falso.exemplo.com/p",
    note: "página falsa",
    name: "Norat",
    email: "denuncia@exemplo.com",
  });
  assert.match(cf, /act=abuse_phishing/);
  assert.match(cf, /email=denuncia%40exemplo.com/);
});
