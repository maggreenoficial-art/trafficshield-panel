import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import type { FaceBox } from "@/lib/news/photo-frame";

const require = createRequire(import.meta.url);
const pico = require("./vendor/pico.js") as {
  unpack_cascade: (
    bytes: Int8Array
  ) => (row: number, col: number, scale: number, pixels: Uint8Array, ldim: number) => number;
  run_cascade: (
    image: { pixels: Uint8Array; nrows: number; ncols: number; ldim: number },
    classify: (row: number, col: number, scale: number, pixels: Uint8Array, ldim: number) => number,
    params: { shiftfactor: number; minsize: number; maxsize: number; scalefactor: number }
  ) => number[][];
  cluster_detections: (dets: number[][], threshold: number) => number[][];
};

let classify: ReturnType<typeof pico.unpack_cascade> | null = null;

function cascadeBytes() {
  const candidates = [
    join(process.cwd(), "src/lib/news/vendor/facefinder"),
    fileURLToPath(new URL("./vendor/facefinder", import.meta.url)),
  ];
  for (const path of candidates) {
    try {
      return readFileSync(path);
    } catch {
      continue;
    }
  }
  throw new Error("O detector de rostos não foi encontrado.");
}

function classifier() {
  if (!classify) classify = pico.unpack_cascade(new Int8Array(cascadeBytes()));
  return classify;
}

export async function detectFaces(photo: Buffer): Promise<FaceBox[]> {
  try {
    const rotated = sharp(photo).rotate();
    const meta = await rotated.metadata();
    const width = meta.width ?? 1;
    const height = meta.height ?? 1;
    const detectWidth = Math.min(720, width);
    const detectHeight = Math.max(1, Math.round((height * detectWidth) / width));
    const { data, info } = await rotated
      .resize(detectWidth, detectHeight, { fit: "fill" })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const gray = new Uint8Array(info.width * info.height);
    for (let pixel = 0, index = 0; pixel < gray.length; pixel += 1, index += info.channels) {
      gray[pixel] = (2 * data[index] + 7 * data[index + 1] + data[index + 2]) / 10;
    }
    const found = pico.run_cascade(
      { pixels: gray, nrows: info.height, ncols: info.width, ldim: info.width },
      classifier(),
      {
        shiftfactor: 0.1,
        minsize: 24,
        maxsize: Math.max(info.width, info.height),
        scalefactor: 1.1,
      }
    );
    const scaleX = width / info.width;
    const scaleY = height / info.height;
    return pico
      .cluster_detections(found, 0.2)
      .filter((detection) => detection[3] > 20)
      .map((detection) => {
        const size = detection[2] * ((scaleX + scaleY) / 2);
        return {
          x: detection[1] * scaleX - size / 2,
          y: detection[0] * scaleY - size / 2,
          width: size,
          height: size,
        };
      });
  } catch {
    return [];
  }
}
