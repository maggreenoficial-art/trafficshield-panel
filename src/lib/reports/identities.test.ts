import assert from "node:assert/strict";
import test from "node:test";
import { parseReportPersonas } from "./identities";

test("separa nome, e-mail e o texto de cada denúncia", () => {
  const raw = JSON.stringify({
    reports: [
      {
        name: "Ana Souza",
        email: "Ana.Souza@gmail.com",
        steps: "Abri o endereço e vi um login igual ao da loja. A página pede senha no lugar da marca verdadeira.",
      },
      {
        name: "Ana Souza",
        email: "ana.souza@gmail.com",
        steps: "Este texto repete a mesma pessoa e deve sair da lista porque o e-mail já entrou.",
      },
      {
        name: "Carlos",
        email: "carlos@gmail.com",
        steps: "Nome curto demais para contar como pessoa completa nesta leva de denúncias.",
      },
    ],
  });
  const personas = parseReportPersonas(raw, 10);
  assert.equal(personas.length, 1);
  assert.equal(personas[0].name, "Ana Souza");
  assert.equal(personas[0].email, "ana.souza@gmail.com");
  assert.match(personas[0].steps, /login igual/);
});
