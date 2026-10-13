import assert from "node:assert/strict";
import test from "node:test";
import { normalizeVercelUrl, readVercelReport, vercelUrlIssue } from "./vercel-form";
import { vercelReportForm } from "./submit";

test("completa o https e aceita domínio com ponto", () => {
  assert.equal(normalizeVercelUrl("falso.exemplo.com/login"), "https://falso.exemplo.com/login");
  assert.equal(vercelUrlIssue("https://falso.exemplo.com/login"), null);
});

test("rejeita URL sem domínio e o próprio painel", () => {
  assert.equal(vercelUrlIssue("https://localhost/x"), "Esse endereço não pode ser denunciado daqui.");
  assert.equal(vercelUrlIssue("naoeurl"), "Insira um URL válido.");
  assert.match(vercelUrlIssue("loja,falsa.com") ?? "", /pontos/);
});

test("o formulário da Vercel manda phishing, encaminhamento e a captura", () => {
  const shot = new File([Uint8Array.from([1, 2, 3])], "tela.png", { type: "image/png" });
  const form = vercelReportForm(
    {
      name: "Ada Lovelace",
      email: "denuncia@exemplo.com",
      infringingUrl: "https://falso.exemplo.com/p",
      realContentUrl: "https://marca.exemplo.com/",
      forwardToOwner: true,
      includeContact: true,
      impacted: false,
      steps: "Abre o login falso e pede a senha.",
    },
    [shot]
  );
  assert.equal(form.get("abuseType"), "Phishing");
  assert.equal(form.get("infringingUrl"), "https://falso.exemplo.com/p");
  assert.equal(form.get("realContentUrl"), "https://marca.exemplo.com/");
  assert.equal(form.get("forwardReportToWebsiteOwner"), "on");
  assert.equal(form.get("includeContactInReportToWebsiteOwner"), "on");
  assert.equal(form.get("reporterOrUserWasImpacted"), "No");
  assert.equal(form.get("stepsToReproduce"), "Abre o login falso e pede a senha.");
  const file = form.get("screenshotEvidence");
  assert.ok(file instanceof File);
  assert.equal(file.name, "tela.png");
});

test("sem captura a denúncia não segue", () => {
  const form = new FormData();
  form.set("reporterName", "Ada Lovelace");
  form.set("reporterEmail", "denuncia@exemplo.com");
  form.set("infringingUrl", "https://falso.exemplo.com/p");
  form.set("stepsToReproduce", "Pede o cartão na página falsa.");
  form.set("reporterOrUserWasImpacted", "No");
  const parsed = readVercelReport(form);
  assert.equal("error" in parsed && parsed.error, "Anexe as capturas de tela de phishing.");
});
