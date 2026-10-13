import assert from "node:assert/strict";
import test from "node:test";
import { feedProxiesFromLines, proxyFeedAuthorized } from "./proxy-feed";

test("a chave libera a lista e uma chave errada não", () => {
  process.env.PROXY_FEED_API_KEY = "chave-de-teste-123";
  assert.equal(proxyFeedAuthorized("Bearer chave-de-teste-123", null), true);
  assert.equal(proxyFeedAuthorized(null, "chave-de-teste-123"), true);
  assert.equal(proxyFeedAuthorized("Bearer outra-chave", null), false);
  assert.equal(proxyFeedAuthorized(null, null), false);
  delete process.env.PROXY_FEED_API_KEY;
  assert.equal(proxyFeedAuthorized("Bearer chave-de-teste-123", null), false);
});

test("a entrega traz host, porta, usuário e senha, no máximo 1000", () => {
  const lines = Array.from(
    { length: 1002 },
    (_, index) => `res.proxy-seller.com:${10000 + index}@user${index}:secret${index}`
  );
  const proxies = feedProxiesFromLines(lines);
  assert.equal(proxies.length, 1000);
  assert.deepEqual(proxies[0], {
    host: "res.proxy-seller.com",
    port: 10000,
    username: "user0",
    password: "secret0",
  });
});
