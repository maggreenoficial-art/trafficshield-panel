import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { FEED_HEIGHT, FEED_WIDTH } from "./feed-title";
import { renderFeedPost } from "./render-feed";

async function pixel(png: Buffer, x: number, y: number) {
  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  const index = (y * info.width + x) * info.channels;
  return [data[index], data[index + 1], data[index + 2]] as const;
}

test("o post sai em 1080x1350, com traço vermelho, logo branca e tag só no urgente", async () => {
  const photo = await sharp({
    create: { width: 400, height: 500, channels: 3, background: "#2458d6" },
  })
    .png()
    .toBuffer();
  const logo = await sharp({
    create: { width: 180, height: 48, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .png()
    .toBuffer();
  const headline = "Prefeitura instala [novos contêineres] de lixo no Jardim Campo Grande.";

  const calm = await renderFeedPost({
    photo,
    logo,
    headline,
    urgent: false,
  });
  const meta = await sharp(calm.png).metadata();
  assert.equal(meta.width, FEED_WIDTH);
  assert.equal(meta.height, FEED_HEIGHT);
  assert.equal(calm.tag, null);
  const bar = await pixel(
    calm.png,
    calm.bar.x + 20,
    calm.bar.y + Math.floor(calm.bar.height / 2)
  );
  assert.deepEqual(bar, [215, 20, 26]);
  const topLeft = await pixel(calm.png, 60, 70);
  assert.notEqual(topLeft[0] > 220 && topLeft[1] > 180 && topLeft[2] < 80, true);
  const logoPixel = await pixel(calm.png, FEED_WIDTH - 60, 70);
  assert.deepEqual(logoPixel, [255, 255, 255]);

  const urgent = await renderFeedPost({
    photo,
    logo,
    headline: "Acidente deixa [feridos] na rodovia",
    urgent: true,
  });
  assert.ok(urgent.tag);
  const tag = await pixel(urgent.png, urgent.tag.x + 8, urgent.tag.y + 8);
  assert.deepEqual(tag, [255, 214, 10]);
  const { data, info } = await sharp(urgent.png).raw().toBuffer({ resolveWithObject: true });
  let inkMin = 9999;
  let inkMax = 0;
  for (let y = urgent.tag.y; y < urgent.tag.y + urgent.tag.height; y++) {
    for (let x = urgent.tag.x; x < urgent.tag.x + urgent.tag.width; x++) {
      const index = (y * info.width + x) * info.channels;
      if (data[index] < 80 && data[index + 1] < 80 && data[index + 2] < 80) {
        inkMin = Math.min(inkMin, x);
        inkMax = Math.max(inkMax, x);
      }
    }
  }
  assert.ok(inkMax - inkMin > 80);
});
