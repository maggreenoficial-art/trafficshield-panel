import type { MetaAd } from "@/lib/offers/types";

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function unixToIso(value: unknown) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n) || n < 1_000_000_000) return null;
  const ms = n > 10_000_000_000 ? n : n * 1000;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function firstImage(snapshot: Record<string, unknown> | null) {
  const images = snapshot?.images;
  if (Array.isArray(images)) {
    for (const image of images) {
      const rec = asRecord(image);
      const url =
        asString(rec?.original_image_url) ||
        asString(rec?.resized_image_url) ||
        asString(rec?.url);
      if (url.startsWith("http")) return url;
    }
  }
  const videos = snapshot?.videos;
  if (Array.isArray(videos)) {
    const rec = asRecord(videos[0]);
    const url = asString(rec?.video_preview_image_url);
    if (url.startsWith("http")) return url;
  }
  const profile = asString(snapshot?.page_profile_picture_url);
  return profile.startsWith("http") ? profile : null;
}

function firstVideo(snapshot: Record<string, unknown> | null) {
  const videos = snapshot?.videos;
  if (!Array.isArray(videos)) return null;
  const rec = asRecord(videos[0]);
  const url =
    asString(rec?.video_hd_url) ||
    asString(rec?.video_sd_url) ||
    asString(rec?.watermarked_video_hd_url);
  return url.startsWith("http") ? url : null;
}

function mapAd(node: Record<string, unknown>): MetaAd | null {
  const id = asString(node.ad_archive_id);
  if (!id) return null;
  const snapshot = asRecord(node.snapshot);
  const body = asRecord(snapshot?.body);
  const platforms = Array.isArray(node.publisher_platform)
    ? node.publisher_platform.map((item) => String(item))
    : [];
  return {
    id,
    pageName: asString(node.page_name) || asString(snapshot?.page_name) || "Página",
    pageId: asString(node.page_id) || asString(snapshot?.page_id) || null,
    body: asString(body?.text) || asString(snapshot?.caption),
    title: asString(snapshot?.title) || null,
    cta: asString(snapshot?.cta_text) || null,
    startDate: unixToIso(node.start_date),
    endDate: unixToIso(node.end_date),
    isActive:
      typeof node.is_active === "boolean"
        ? node.is_active
        : node.is_active === "true"
          ? true
          : node.is_active === "false"
            ? false
            : null,
    imageUrl: firstImage(snapshot),
    videoUrl: firstVideo(snapshot),
    snapshotUrl: `https://www.facebook.com/ads/library/?id=${id}`,
    linkUrl: asString(snapshot?.link_url) || null,
    platforms,
  };
}

function visitAds(
  node: unknown,
  sink: MetaAd[],
  seen: Set<string>,
  totals: { value: number | null },
  depth = 0
) {
  if (!node || typeof node !== "object" || depth > 50) return;
  if (Array.isArray(node)) {
    for (const item of node) visitAds(item, sink, seen, totals, depth + 1);
    return;
  }
  const rec = node as Record<string, unknown>;
  const conn = asRecord(rec.search_results_connection);
  const countNode = conn ?? (Array.isArray(rec.edges) && rec.count != null ? rec : null);
  if (countNode?.count != null) {
    const n = Number(countNode.count);
    if (Number.isFinite(n) && n >= 0) {
      totals.value = Math.max(totals.value ?? 0, n);
    }
  }
  if (typeof rec.ad_archive_id === "string") {
    const ad = mapAd(rec);
    if (ad && !seen.has(ad.id)) {
      seen.add(ad.id);
      sink.push(ad);
    }
  }
  for (const value of Object.values(rec)) visitAds(value, sink, seen, totals, depth + 1);
}

function emptyAd(id: string): MetaAd {
  return {
    id,
    pageName: "Página",
    pageId: null,
    body: "",
    title: null,
    cta: null,
    startDate: null,
    endDate: null,
    isActive: null,
    imageUrl: null,
    videoUrl: null,
    snapshotUrl: `https://www.facebook.com/ads/library/?id=${id}`,
    linkUrl: null,
    platforms: [],
  };
}

export function parseAdLibraryPage(html: string): {
  ads: MetaAd[];
  total: number | null;
} {
  const ads: MetaAd[] = [];
  const seen = new Set<string>();
  const totals = { value: null as number | null };
  let pos = 0;
  while (pos < html.length) {
    const start = html.indexOf("<script", pos);
    if (start < 0) break;
    const gt = html.indexOf(">", start);
    if (gt < 0) break;
    const end = html.indexOf("</script>", gt);
    if (end < 0) break;
    const blob = html.slice(gt + 1, end);
    pos = end + 9;
    if (
      (!blob.includes("ad_archive_id") && !blob.includes("search_results_connection")) ||
      blob.length < 40
    ) {
      continue;
    }
    try {
      visitAds(JSON.parse(blob), ads, seen, totals);
    } catch {
      /* script não é JSON puro */
    }
  }
  if (!ads.length && html.includes("ad_archive_id")) {
    const loose = html.match(/\{"ad_archive_id":"(\d+)"/g) ?? [];
    for (const item of loose) {
      const id = item.match(/\d+/)?.[0];
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ads.push(emptyAd(id));
    }
  }
  return {
    ads,
    total: totals.value ?? (ads.length ? ads.length : null),
  };
}

export function parseAdLibraryHtml(html: string): MetaAd[] {
  return parseAdLibraryPage(html).ads;
}

export function adLibrarySearchUrl(input: {
  keywords: string;
  country: string;
  mediaType: string;
  searchType?: "keyword_unordered" | "keyword_exact_phrase";
}) {
  const url = new URL("https://www.facebook.com/ads/library/");
  url.searchParams.set("active_status", "active");
  url.searchParams.set("ad_type", "all");
  url.searchParams.set("country", input.country || "BR");
  url.searchParams.set("is_targeted_country", "false");
  url.searchParams.set("media_type", input.mediaType || "all");
  url.searchParams.set("q", input.keywords.trim());
  url.searchParams.set(
    "search_type",
    input.searchType || "keyword_exact_phrase"
  );
  return url.toString();
}
