import assert from "node:assert/strict";
import test from "node:test";
import { parseAutoVideoPlan } from "./auto-video";

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
