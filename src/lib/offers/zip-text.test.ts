import assert from "node:assert/strict";
import test from "node:test";
import { deflateRawSync } from "node:zlib";
import { unzipTextFiles } from "./zip-text";

function zipOne(name: string, body: string) {
  const data = Buffer.from(body);
  const deflated = deflateRawSync(data);
  const nameBuf = Buffer.from(name);
  const header = Buffer.alloc(30);
  header.write("PK\u0003\u0004", 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(8, 8);
  header.writeUInt16LE(nameBuf.length, 26);
  header.writeUInt32LE(deflated.length, 18);
  header.writeUInt32LE(data.length, 22);
  return Buffer.concat([header, nameBuf, deflated]);
}

test("lê txt de dentro do zip", () => {
  const zip = zipOne(
    "proxies.txt",
    "res.proxy-seller.com:10000@user123:pass456\n"
  );
  assert.match(unzipTextFiles(zip), /res\.proxy-seller\.com:10000/);
});
