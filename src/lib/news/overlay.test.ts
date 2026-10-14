import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { FEED_HEIGHT, FEED_WIDTH } from "./feed-title";
import { compositeArtOverPhoto, cropNewsPhoto } from "./overlay";

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
          `<svg width="${FEED_WIDTH}" height="${FEED_HEIGHT}"><rect x="60" y="900" width="180" height="10" fill="#D7141A"/></svg>`
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
  assert.deepEqual(at(80, 904), [215, 20, 26]);
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
  assert.deepEqual(at(1000, 200), [36, 88, 214]);
  assert.deepEqual(at(80, 1004), [215, 20, 26]);
  assert.deepEqual(at(400, 860), [0, 0, 0]);
  const mid = at(400, 600);
  assert.ok(mid[2] < 140 && mid[2] > 20);
});

test("o recorte centraliza nos rostos e não corta quem está à direita", async () => {
  const photo = await sharp({
    create: { width: 2000, height: 900, channels: 3, background: "#c8392b" },
  })
    .composite([
      {
        input: await sharp({
          create: { width: 400, height: 900, channels: 3, background: "#2458d6" },
        })
          .png()
          .toBuffer(),
        left: 1600,
        top: 0,
      },
    ])
    .png()
    .toBuffer();
  const cropped = await cropNewsPhoto(photo, [{ x: 1680, y: 180, width: 120, height: 120 }]);
  const { data, info } = await sharp(cropped).raw().toBuffer({ resolveWithObject: true });
  const at = (x: number, y: number) => {
    const index = (y * info.width + x) * info.channels;
    return [data[index], data[index + 1], data[index + 2]];
  };
  assert.deepEqual(at(1040, 120), [36, 88, 214]);
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
