import assert from "node:assert/strict";
import test from "node:test";
import { newsItemFromInstagram, instagramPostUrl } from "./social";

test("transforma o resultado do Google News em post do Instagram com data", () => {
  const post = newsItemFromInstagram({
    url: "https://www.instagram.com/p/DeAolFiEQZE/?hl=pt",
    title: "A Secretaria Municipal de Saúde de Cassilândia iniciou uma mobilização",
    publishedAt: "2026-10-02T23:11:16.000Z",
  });
  assert.equal(post?.kind, "instagram");
  assert.equal(post?.mediaKind, "image");
  assert.equal(post?.videoUrl, null);
  assert.equal(post?.url, "https://www.instagram.com/p/DeAolFiEQZE/");
  assert.equal(post?.publishedAt, "2026-10-02T23:11:16.000Z");
  assert.match(post?.title ?? "", /Saúde de Cassilândia/);
});

test("lê Reel e post do Instagram a partir da URL decodificada", () => {
  assert.equal(
    instagramPostUrl("https://www.instagram.com/reel/DdluLGfD7U-/"),
    "https://www.instagram.com/reel/DdluLGfD7U-/"
  );
  assert.equal(
    instagramPostUrl("https://www.instagram.com/p/Ddj3b9ilrbs/"),
    "https://www.instagram.com/p/Ddj3b9ilrbs/"
  );
});
