import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse, type Font } from "opentype.js";
import sharp from "sharp";
import {
  buildFeedTitle,
  FEED_BAR_COLOR,
  FEED_BAR_HEIGHT,
  FEED_BAR_WIDTH,
  FEED_HANDLE,
  FEED_HEIGHT,
  FEED_MARGIN,
  FEED_MAX_LINES,
  FEED_WIDTH,
  wrapFeedTitle,
  type FeedWord,
} from "@/lib/news/feed-title";

const TITLE_COLOR = "#FFFFFF";
const TAG_FILL = "#FFD60A";
const TAG_INK = "#111111";

let extraBold: Font | null = null;
let light: Font | null = null;

function fontFile(file: string) {
  try {
    return readFileSync(new URL(`./fonts/${file}`, import.meta.url));
  } catch {
    return readFileSync(join(process.cwd(), "src/lib/news/fonts", file));
  }
}

function loadFont(file: string) {
  const buf = fontFile(file);
  return parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
}

function titleFont() {
  extraBold ??= loadFont("BarlowCondensed-ExtraBold.ttf");
  return extraBold;
}

function footerFont() {
  light ??= loadFont("Barlow-Light.ttf");
  return light;
}

function textPath(font: Font, file: string, text: string, x: number, y: number, size: number, fill: string) {
  const draw = (source: Font) => {
    const path = source.getPath(text, x, y, size);
    path.fill = fill;
    return path.toSVG({ decimalPlaces: 2 });
  };
  const svg = draw(font);
  if (!svg.includes("NaN")) return svg;
  return draw(loadFont(file));
}

export type FeedRender = {
  png: Buffer;
  urgent: boolean;
  bar: { x: number; y: number; width: number; height: number };
  tag: { x: number; y: number; width: number; height: number } | null;
};

export async function renderFeedPost(input: {
  photo: Buffer | null;
  logo: Buffer;
  headline: string;
  urgent: boolean;
}): Promise<FeedRender> {
  const words = buildFeedTitle(input.headline);
  if (!words.length) throw new Error("Escreva o título da notícia.");

  const maxWidth = FEED_WIDTH - FEED_MARGIN * 2;
  let size = 86;
  let lines: FeedWord[][] = [];
  while (size >= 46) {
    const measure = (text: string) => titleFont().getAdvanceWidth(text, size);
    lines = wrapFeedTitle(words, measure, maxWidth);
    const tooWide = lines.some((line) => measure(line.map((word) => word.text).join(" ")) > maxWidth);
    if (lines.length <= FEED_MAX_LINES && !tooWide) break;
    size -= 2;
  }
  if (lines.length > FEED_MAX_LINES) {
    lines = lines.slice(0, FEED_MAX_LINES);
  }

  const lineGap = Math.round(size * 1.02);
  const footerSize = 30;
  const footerBaseline = FEED_HEIGHT - 52;
  const lastBaseline = footerBaseline - 84;
  const firstBaseline = lastBaseline - (lines.length - 1) * lineGap;
  const barY = Math.round(firstBaseline - size * 0.8 - 18);
  const bar = {
    x: FEED_MARGIN,
    y: barY,
    width: FEED_BAR_WIDTH,
    height: FEED_BAR_HEIGHT,
  };

  const tagSize = 32;
  const tagPadX = 16;
  const tagPadY = 10;
  const tagWidth = Math.ceil(titleFont().getAdvanceWidth("URGENTE", tagSize) + tagPadX * 2);
  const tagHeight = tagSize + tagPadY * 2;
  const tag = input.urgent
    ? { x: 48, y: 48, width: tagWidth, height: tagHeight }
    : null;

  const paths: string[] = [];
  lines.forEach((line, index) => {
    let x = FEED_MARGIN;
    const y = firstBaseline + index * lineGap;
    for (const word of line) {
      const piece = word.text;
      paths.push(
        textPath(titleFont(), "BarlowCondensed-ExtraBold.ttf", piece, x, y, size, word.red ? FEED_BAR_COLOR : TITLE_COLOR)
      );
      x += titleFont().getAdvanceWidth(`${piece} `, size);
    }
  });

  const handleWidth = footerFont().getAdvanceWidth(FEED_HANDLE, footerSize);
  paths.push(
    textPath(
      footerFont(),
      "Barlow-Light.ttf",
      FEED_HANDLE,
      (FEED_WIDTH - handleWidth) / 2,
      footerBaseline,
      footerSize,
      TITLE_COLOR
    )
  );

  if (tag) {
    const baseline = tag.y + tagPadY + tagSize * 0.78;
    const textWidth = titleFont().getAdvanceWidth("URGENTE", tagSize);
    paths.push(
      textPath(
        titleFont(),
        "BarlowCondensed-ExtraBold.ttf",
        "URGENTE",
        tag.x + (tag.width - textWidth) / 2,
        baseline,
        tagSize,
        TAG_INK
      )
    );
  }

  const overlay = Buffer.from(`<svg width="${FEED_WIDTH}" height="${FEED_HEIGHT}" viewBox="0 0 ${FEED_WIDTH} ${FEED_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#000000" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#000000" stop-opacity="0"/>
      <stop offset="1" stop-color="#000000" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect width="${FEED_WIDTH}" height="${FEED_HEIGHT}" fill="url(#shade)"/>
  <rect x="${bar.x}" y="${bar.y}" width="${bar.width}" height="${bar.height}" fill="${FEED_BAR_COLOR}"/>
  ${tag ? `<rect x="${tag.x}" y="${tag.y}" width="${tag.width}" height="${tag.height}" fill="${TAG_FILL}"/>` : ""}
  ${paths.join("\n")}
</svg>`);

  const base = input.photo
    ? await sharp(input.photo)
        .rotate()
        .resize(FEED_WIDTH, FEED_HEIGHT, { fit: "cover", position: "top" })
        .png()
        .toBuffer()
    : await sharp({
        create: {
          width: FEED_WIDTH,
          height: FEED_HEIGHT,
          channels: 3,
          background: "#1a1a1a",
        },
      })
        .png()
        .toBuffer();

  const logo = await sharp(input.logo)
    .rotate()
    .ensureAlpha()
    .resize({ width: 340, height: 96, fit: "inside" })
    .png()
    .toBuffer({ resolveWithObject: true });

  const png = await sharp(base)
    .composite([
      { input: overlay, top: 0, left: 0 },
      {
        input: logo.data,
        top: 48,
        left: FEED_WIDTH - logo.info.width - 48,
      },
    ])
    .png()
    .toBuffer();

  return { png, urgent: input.urgent, bar, tag };
}
