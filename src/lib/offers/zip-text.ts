import { inflateRawSync } from "node:zlib";

function readU16(buf: Buffer, offset: number) {
  return buf.readUInt16LE(offset);
}

function readU32(buf: Buffer, offset: number) {
  return buf.readUInt32LE(offset);
}

export function unzipTextFiles(input: Buffer): string {
  const chunks: string[] = [];
  let offset = 0;
  while (offset + 30 <= input.length) {
    if (input.toString("ascii", offset, offset + 4) !== "PK\u0003\u0004") break;
    const method = readU16(input, offset + 8);
    const nameLen = readU16(input, offset + 26);
    const extraLen = readU16(input, offset + 28);
    const flags = readU16(input, offset + 6);
    let compact = readU32(input, offset + 18);
    const nameStart = offset + 30;
    const name = input.toString("utf8", nameStart, nameStart + nameLen);
    let dataStart = nameStart + nameLen + extraLen;
    if (flags & 0x08) {
      /* data descriptor: sizes come after the file; skip this entry */
      break;
    }
    const data = input.subarray(dataStart, dataStart + compact);
    offset = dataStart + compact;
    if (name.endsWith("/") || /\.(png|jpe?g|webp|gif|exe)$/i.test(name)) continue;
    if (!/\.(txt|csv|lst|json|prox(y|ies))?$/i.test(name) && name.includes(".")) {
      continue;
    }
    try {
      const raw =
        method === 0 ? data : method === 8 ? inflateRawSync(data) : null;
      if (!raw) continue;
      const text = raw.toString("utf8").replace(/^\uFEFF/, "");
      if (text.trim()) chunks.push(text);
    } catch {
      /* skip broken entry */
    }
  }
  return chunks.join("\n");
}

export function readProxyUpload(fileName: string, bytes: Buffer): string {
  if (/\.zip$/i.test(fileName) || bytes.subarray(0, 2).toString() === "PK") {
    return unzipTextFiles(bytes);
  }
  return bytes.toString("utf8").replace(/^\uFEFF/, "");
}
