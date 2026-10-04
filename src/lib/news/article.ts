import { assertPublicOriginHostname } from "@/lib/traffic-shield/origin-url";

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function parsePublicHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    assertPublicOriginHostname(url.hostname);
    return url;
  } catch {
    return null;
  }
}

export function isHostedPlayer(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host === "youtu.be" ||
      host.includes("vimeo.com") ||
      host.includes("facebook.com") ||
      host.includes("fb.watch") ||
      host.includes("tiktok.com") ||
      host.includes("instagram.com")
    );
  } catch {
    return false;
  }
}

export function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function ogContent(html: string, property: string) {
  const named = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)`,
    "i"
  );
  const reversed = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  return decode(html.match(named)?.[1] ?? html.match(reversed)?.[1] ?? "");
}

function firstMatch(html: string, pattern: RegExp) {
  return decode(html.match(pattern)?.[1] ?? "");
}

export function extractArticleMedia(html: string): {
  imageUrl: string | null;
  videoUrl: string | null;
} {
  const image =
    ogContent(html, "og:image") ||
    ogContent(html, "twitter:image") ||
    ogContent(html, "twitter:image:src");
  const video =
    ogContent(html, "og:video:secure_url") ||
    ogContent(html, "og:video:url") ||
    ogContent(html, "og:video") ||
    ogContent(html, "twitter:player:stream") ||
    firstMatch(html, /<source[^>]+type=["']video\/[^"']+["'][^>]+src=["']([^"']+)/i) ||
    firstMatch(html, /<source[^>]+src=["']([^"']+)["'][^>]+type=["']video\//i) ||
    firstMatch(html, /<video[^>]+src=["']([^"']+)/i) ||
    firstMatch(html, /<(?:iframe|embed)[^>]+src=["']([^"']*(?:youtube|youtu\.be|vimeo)[^"']*)/i);

  return {
    imageUrl: parsePublicHttpUrl(image)?.toString() ?? null,
    videoUrl: parsePublicHttpUrl(video)?.toString() ?? null,
  };
}

export async function fetchNewsArticle(rawUrl: string): Promise<{
  text: string;
  imageUrl: string | null;
  videoUrl: string | null;
}> {
  const url = parsePublicHttpUrl(rawUrl);
  if (!url) return { text: "", imageUrl: null, videoUrl: null };
  if (url.hostname.includes("news.google.com")) {
    return { text: "", imageUrl: null, videoUrl: null };
  }

  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      headers: {
        Accept: "text/html,text/plain",
        "User-Agent": "Mozilla/5.0 (compatible; NoratNews/1.0)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { text: "", imageUrl: null, videoUrl: null };
    const html = (await res.text()).slice(0, 400_000);
    const media = extractArticleMedia(html);
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3500);
    return { text, ...media };
  } catch {
    return { text: "", imageUrl: null, videoUrl: null };
  }
}
