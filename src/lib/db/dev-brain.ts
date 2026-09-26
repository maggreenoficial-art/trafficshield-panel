import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type { DevDoc } from "@/lib/product-dev/types";

const BUCKET = "dev-brain";
const PATH = "platform/brain.json";

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

export async function listBrainDocs(): Promise<DevDoc[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(PATH);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as { docs?: DevDoc[] };
    return Array.isArray(parsed.docs) ? parsed.docs.slice(0, 3) : [];
  } catch {
    return [];
  }
}

export async function saveBrainDocs(docs: DevDoc[]): Promise<DevDoc[]> {
  await ensureBucket();
  const supabase = createAdminClient();
  const clean = docs
    .filter((doc) => doc.text.trim())
    .slice(0, 3)
    .map((doc) => ({
      slot: doc.slot,
      name: doc.name.slice(0, 180),
      text: doc.text.slice(0, 160_000),
    }));
  const body = JSON.stringify({ docs: clean });
  const { error } = await supabase.storage.from(BUCKET).upload(PATH, body, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
  return clean;
}
