import assert from "node:assert/strict";
import test from "node:test";
import { builtInReportPersonas } from "./identities";

test("os mil dados já vêm prontos, cada um com nome, e-mail e título", () => {
  const personas = builtInReportPersonas("https://orelhometro.vercel.app/", 1000);
  assert.equal(personas.length, 1000);
  assert.equal(new Set(personas.map((item) => item.email)).size, 1000);
  assert.equal(new Set(personas.map((item) => item.steps)).size, 1000);
  assert.equal(personas[0].name, "Ana Silva");
  assert.equal(personas[0].email, "ana.silva0@gmail.com");
  assert.equal(
    personas[0].steps,
    "orelhometro[.]vercel[.]app hosts a page that asks visitors to send a Pix"
  );
  assert.match(personas[1].steps, /collects payment through a Pix form/);
});
