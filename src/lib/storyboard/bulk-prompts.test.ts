import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { imageDownloadName, parseBulkPrompts } from "./bulk-prompts";
import { buildStoredZip } from "../zip-store";

test("separa prompts por linha, bloco ou ---", () => {
  assert.deepEqual(parseBulkPrompts("um\ndois\ntres"), ["um", "dois", "tres"]);
  assert.deepEqual(parseBulkPrompts("linha 1\nlinha 2\n\noutro prompt"), [
    "linha 1\nlinha 2",
    "outro prompt",
  ]);
  assert.deepEqual(parseBulkPrompts("a\n\n---\n\nb"), ["a", "b"]);
  assert.deepEqual(parseBulkPrompts("  \n"), []);
});

test("nome de arquivo fica curto e sem acento", () => {
  assert.equal(
    imageDownloadName(0, "Mulher com caixa", "png"),
    "01-mulher-com-caixa.png"
  );
});

test("zip guarda o arquivo sem comprimir", () => {
  const payload = new Uint8Array([137, 80, 78, 71, 1, 2, 3]);
  const zip = buildStoredZip([{ name: "01-cena.png", data: payload }]);
  const dir = mkdtempSync(join(tmpdir(), "storyboard-zip-"));
  const file = join(dir, "imagens.zip");
  writeFileSync(file, zip);
  assert.ok(readFileSync(file).byteLength === zip.byteLength);
});
