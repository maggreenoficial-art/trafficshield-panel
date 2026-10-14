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

test("foto larga cobre até y=880 e o preto do código só começa abaixo dela", async () => {
  const photo = await sharp({
    create: { width: 1600, height: 700, channels: 3, background: "#2458d6" },
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
          `<svg width="${FEED_WIDTH}" height="${FEED_HEIGHT}"><rect x="60" y="1000" width="180" height="10" fill="#D7141A"/></svg>`
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
  assert.deepEqual(at(80, 80), [36, 88, 214]);
  assert.deepEqual(at(1000, 700), [36, 88, 214]);
  assert.deepEqual(at(80, 1004), [215, 20, 26]);
  assert.deepEqual(at(400, 920), [0, 0, 0]);
});

test("camada opaca é recusada para a foto não ficar coberta", async () => {
  const photo = await sharp({
    create: { width: 400, height: 600, channels: 3, background: "#2458d6" },
  })
    .png()
    .toBuffer();
  const art = await sharp({
    create: { width: FEED_WIDTH, height: FEED_HEIGHT, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(() => compositeArtOverPhoto(art, photo), /transparência/);
});
