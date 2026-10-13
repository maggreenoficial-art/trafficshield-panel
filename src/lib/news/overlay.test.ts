import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { FEED_HEIGHT, FEED_WIDTH } from "./feed-title";
import { compositeArtOverPhoto } from "./overlay";

test("a camada transparente cola por cima e a foto original continua no topo", async () => {
  const photo = await sharp({
    create: { width: 400, height: 600, channels: 3, background: "#2458d6" },
  })
    .png()
    .toBuffer();
  const art = await sharp({
    create: {
      width: FEED_WIDTH,
      height: FEED_HEIGHT,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: Buffer.from(
          `<svg width="${FEED_WIDTH}" height="${FEED_HEIGHT}"><rect x="60" y="1100" width="180" height="10" fill="#D7141A"/></svg>`
        ),
        top: 0,
        left: 0,
      },
    ])
    .png()
    .toBuffer();

  const png = await compositeArtOverPhoto(art, photo);
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const index = (y * info.width + x) * info.channels;
    return [data[index], data[index + 1], data[index + 2]];
  };
  assert.deepEqual(at(200, 80), [36, 88, 214]);
  assert.deepEqual(at(80, 1104), [215, 20, 26]);
});

test("foto horizontal ocupa a largura, fica no topo e o preto começa embaixo dela", async () => {
  const photo = await sharp({
    create: { width: 800, height: 200, channels: 3, background: "#2458d6" },
  })
    .png()
    .toBuffer();
  const art = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .png()
    .toBuffer();
  const png = await compositeArtOverPhoto(art, photo);
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const index = (y * info.width + x) * info.channels;
    return [data[index], data[index + 1], data[index + 2]];
  };
  const photoBottom = Math.round((FEED_WIDTH * 200) / 800);
  assert.deepEqual(at(40, 12), [36, 88, 214]);
  assert.deepEqual(at(40, photoBottom + 30), [0, 0, 0]);
  const edge = at(40, photoBottom - 2);
  assert.ok(edge[2] < 40);
});
