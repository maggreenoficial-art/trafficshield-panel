import assert from "node:assert/strict";
import test from "node:test";
import { parseOfferProxy, parseOfferProxyList } from "./proxy-parse";

test("lê host:porta@usuario:senha da Proxy-Seller", () => {
  const proxy = parseOfferProxy(
    "res.proxy-seller.com:10000@user123:pass456"
  );
  assert.equal(proxy?.host, "res.proxy-seller.com");
  assert.equal(proxy?.port, 10000);
  assert.equal(proxy?.username, "user123");
  assert.match(proxy?.href ?? "", /^http:\/\/user123:/);
});

test("lê usuario:senha@host:porta", () => {
  const proxy = parseOfferProxy("user:pass@res.proxy-seller.com:10001");
  assert.equal(proxy?.host, "res.proxy-seller.com");
  assert.equal(proxy?.port, 10001);
  assert.equal(proxy?.username, "user");
});

test("junta lista e tira repetido", () => {
  const list = parseOfferProxyList(`
    res.proxy-seller.com:10000@user123:pass456
    res.proxy-seller.com:10000@user123:pass456
    user:pass@res.proxy-seller.com:10002
  `);
  assert.equal(list.length, 2);
});
