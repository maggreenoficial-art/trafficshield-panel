import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { FEED_HEIGHT, FEED_WIDTH } from "@/lib/news/feed-title";

const BUCKET = "storyboard-assets";

async function mostlyTransparent(png: Buffer) {
  const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixels = info.width * info.height;
  let clear = 0;
  for (let index = 3; index < data.length; index += info.channels) {
    if (data[index] < 16) clear += 1;
  }
  return clear / pixels > 0.2;
}

const PHOTO_BOTTOM = 880;

async function photoBase(photo: Buffer) {
  const resized = await sharp(photo)
    .rotate()
    .resize(FEED_WIDTH, PHOTO_BOTTOM, { fit: "cover", position: sharp.strategy.attention })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: FEED_WIDTH,
      height: FEED_HEIGHT,
      channels: 3,
      background: "#000000",
    },
  })
    .composite([{ input: resized, top: 0, left: 0 }])
    .png()
    .toBuffer();
}

export async function compositeArtOverPhoto(art: Buffer, photo: Buffer | null) {
  const layer = await sharp(art)
    .rotate()
    .resize(FEED_WIDTH, FEED_HEIGHT, { fit: "fill" })
    .ensureAlpha()
    .png()
    .toBuffer();
  if (!(await mostlyTransparent(layer))) {
    throw new Error("A camada de arte veio sem transparência. A foto original não foi coberta.");
  }
  const base = photo
    ? await photoBase(photo)
    : await sharp({
        create: {
          width: FEED_WIDTH,
          height: FEED_HEIGHT,
          channels: 3,
          background: "#000000",
        },
      })
        .png()
        .toBuffer();
  return sharp(base).composite([{ input: layer, top: 0, left: 0 }]).png().toBuffer();
}

async function fetchImage(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: { Accept: "image/*,*/*" },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`A imagem respondeu HTTP ${res.status}.`);
  return Buffer.from(await res.arrayBuffer());
}

export async function publishNewsComposite(input: {
  tenantId: string;
  blockId: string;
  artUrl: string;
  photoUrl: string;
}) {
  const art = await fetchImage(input.artUrl);
  const photo = input.photoUrl.startsWith("http") ? await fetchImage(input.photoUrl) : null;
  const png = await compositeArtOverPhoto(art, photo);
  const path = `${input.tenantId}/news-overlay-${input.blockId}.png`;
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, png, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) throw error;
  return `${getSupabaseUrl().replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;
}
