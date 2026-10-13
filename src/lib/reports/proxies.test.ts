import assert from "node:assert/strict";
import test from "node:test";
import { REPORT_PROXY_LIMIT, reportProxyLines } from "./proxies";

test("libera no máximo 1000 proxies e ignora repetidos", () => {
  const lines = Array.from({ length: 1005 }, (_, index) => {
    const port = 10000 + (index % 1002);
    return `res.proxy-seller.com:${port}@user:secret`;
  });
  const released = reportProxyLines(lines.join("\n"));
  assert.equal(REPORT_PROXY_LIMIT, 1000);
  assert.equal(released.length, 1000);
  assert.equal(new Set(released).size, 1000);
  assert.equal(released[0], "res.proxy-seller.com:10000@user:secret");
});
