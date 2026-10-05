import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export type WatchedOfferPage = {
  pageId: string | null;
  pageName: string;
  keywords: string;
  country: string;
  adCount: number;
  linkUrl: string | null;
  snapshotUrl: string | null;
  reason: string;
  watchedAt: string;
};

const BUCKET = "dev-brain";
const PATH = "platform/offer-watch.json";

function asWatch(value: unknown): WatchedOfferPage | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const pageName = typeof rec.pageName === "string" ? rec.pageName.trim() : "";
  if (!pageName) return null;
  return {
    pageId: typeof rec.pageId === "string" && rec.pageId.trim() ? rec.pageId.trim() : null,
    pageName: pageName.slice(0, 120),
    keywords: typeof rec.keywords === "string" ? rec.keywords.trim().slice(0, 100) : "",
    country: typeof rec.country === "string" && rec.country.trim() ? rec.country.trim().slice(0, 8) : "BR",
    adCount: Number.isFinite(Number(rec.adCount)) ? Math.max(0, Math.floor(Number(rec.adCount))) : 0,
    linkUrl: typeof rec.linkUrl === "string" && rec.linkUrl.startsWith("http") ? rec.linkUrl.slice(0, 500) : null,
    snapshotUrl:
      typeof rec.snapshotUrl === "string" && rec.snapshotUrl.startsWith("http")
        ? rec.snapshotUrl.slice(0, 500)
        : null,
    reason: typeof rec.reason === "string" ? rec.reason.trim().slice(0, 280) : "",
    watchedAt: typeof rec.watchedAt === "string" ? rec.watchedAt : new Date().toISOString(),
  };
}

function watchKey(page: Pick<WatchedOfferPage, "pageId" | "pageName">) {
  return (page.pageId || page.pageName).trim().toLowerCase();
}

async function ensureBucket() {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

export async function listWatchedOfferPages(): Promise<WatchedOfferPage[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(PATH);
  if (error || !data) return [];
  try {
    const parsed = JSON.parse(await data.text()) as { pages?: unknown };
    return (Array.isArray(parsed.pages) ? parsed.pages : [])
      .map(asWatch)
      .filter((item): item is WatchedOfferPage => Boolean(item))
      .slice(0, 80);
  } catch {
    return [];
  }
}

async function saveWatchedOfferPages(pages: WatchedOfferPage[]) {
  if (!hasAdminClient()) return pages;
  await ensureBucket();
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(
    PATH,
    JSON.stringify({ pages: pages.slice(0, 80) }),
    { contentType: "application/json", upsert: true }
  );
  if (error) throw error;
  return pages;
}

export async function upsertWatchedOfferPage(
  input: Omit<WatchedOfferPage, "watchedAt"> & { watchedAt?: string }
): Promise<WatchedOfferPage[]> {
  const next = asWatch({ ...input, watchedAt: input.watchedAt || new Date().toISOString() });
  if (!next) throw new Error("Página inválida.");
  const current = await listWatchedOfferPages();
  const key = watchKey(next);
  const pages = [next, ...current.filter((item) => watchKey(item) !== key)];
  return saveWatchedOfferPages(pages);
}

export async function removeWatchedOfferPage(input: {
  pageId?: string | null;
  pageName?: string;
}): Promise<WatchedOfferPage[]> {
  const key = watchKey({
    pageId: input.pageId ?? null,
    pageName: input.pageName?.trim() || "",
  });
  if (!key) return listWatchedOfferPages();
  const current = await listWatchedOfferPages();
  return saveWatchedOfferPages(current.filter((item) => watchKey(item) !== key));
}

export function isWatchedPage(
  pages: WatchedOfferPage[],
  input: { pageId?: string | null; pageName: string }
) {
  const key = watchKey({ pageId: input.pageId ?? null, pageName: input.pageName });
  return pages.some((item) => watchKey(item) === key);
}
