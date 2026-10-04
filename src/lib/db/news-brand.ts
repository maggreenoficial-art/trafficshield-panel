import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type { NewsBrand } from "@/lib/news/types";

const BUCKET = "dev-brain";
const PATH = "platform/news-brand.json";

function cleanUrl(value: unknown) {
  return typeof value === "string" && value.startsWith("https://")
    ? value.slice(0, 500)
    : null;
}

async function ensureBucket() {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw error;
  }
}

export async function getNewsBrand(): Promise<NewsBrand> {
  if (!hasAdminClient()) return { logoUrl: null, mockupUrl: null };
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(PATH);
  if (error || !data) return { logoUrl: null, mockupUrl: null };
  try {
    const parsed = JSON.parse(await data.text()) as NewsBrand;
    return {
      logoUrl: cleanUrl(parsed.logoUrl),
      mockupUrl: cleanUrl(parsed.mockupUrl),
    };
  } catch {
    return { logoUrl: null, mockupUrl: null };
  }
}

export async function saveNewsBrand(input: NewsBrand): Promise<NewsBrand> {
  await ensureBucket();
  const brand: NewsBrand = {
    logoUrl: cleanUrl(input.logoUrl),
    mockupUrl: cleanUrl(input.mockupUrl),
  };
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(PATH, JSON.stringify(brand), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;
  return brand;
}
