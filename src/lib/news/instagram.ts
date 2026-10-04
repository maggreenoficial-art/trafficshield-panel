import { mapNewsPool } from "@/lib/news/google-url";
import { instagramPostUrl } from "@/lib/news/social";
import type { NewsItem } from "@/lib/news/types";

const CRAWLER_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

export type InstagramMeta = {
  pageName: string;
  username: string;
  caption: string;
  imageUrl: string | null;
  videoUrl: string | null;
  mediaKind: "image" | "video";
};

export function decodeInstagramText(value: string) {
  return value
    .replace(/\\u0026/g, "&")
    .replace(/\\u003C/gi, "<")
    .replace(/\\u003E/gi, ">")
    .replace(/\\\//g, "/")
    .replace(/\\"/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();
}

export function instagramMediaKindFromUrl(raw: string): "image" | "video" | null {
  const url = instagramPostUrl(raw);
  if (!url) return null;
  return /\/(?:reel|tv)\//.test(url) ? "video" : "image";
}

export function parseInstagramOgTitle(raw: string) {
  const decoded = decodeInstagramText(raw);
  const match = decoded.match(/^(.+?) on Instagram:\s*[“"]?([\s\S]*?)[”"]?\s*$/);
  return {
    pageName: match?.[1]?.trim() || "",
    caption: (match?.[2] || "").replace(/^["“]|["”]$/g, "").trim(),
  };
}

export function parseInstagramSharedBy(html: string) {
  const match = html.match(/shared by\s+([^<(]+?)\s*\(@([A-Za-z0-9._]+)\)/i);
  return {
    pageName: match?.[1]?.replace(/&nbsp;/g, " ").trim() || "",
    username: match?.[2] || "",
  };
}

export function parseInstagramVideoUrl(html: string) {
  const block = html.match(/"video_versions":\[(.*?)\]/);
  if (!block) return null;
  const urls = [...block[1].matchAll(/"url":"(https:\\?\/\\?\/[^"]+)"/g)].map((match) =>
    decodeInstagramText(match[1])
  );
  const mp4s = urls.filter((url) => /\.mp4(\?|$)/i.test(url));
  return mp4s.at(-1) || mp4s[0] || null;
}

export function parseInstagramImageUrl(html: string) {
  const og =
    html.match(/property="og:image"\s+content="([^"]+)"/i)?.[1] ||
    html.match(/content="([^"]+)"\s+property="og:image"/i)?.[1];
  if (og) return decodeInstagramText(og);
  const display = html.match(/"display_url":"(https:\\?\/\\?\/[^"]+)"/);
  return display ? decodeInstagramText(display[1]) : null;
}

export function parseInstagramUsername(html: string) {
  return (
    html.match(/comments - ([A-Za-z0-9._]+) on /i)?.[1] ||
    html.match(/"username":"([A-Za-z0-9._]+)"/)?.[1] ||
    parseInstagramSharedBy(html).username ||
    ""
  );
}

export function formatInstagramSource(meta: Pick<InstagramMeta, "pageName" | "username">) {
  if (meta.pageName && meta.username) return `${meta.pageName} · @${meta.username}`;
  if (meta.pageName) return meta.pageName;
  if (meta.username) return `@${meta.username}`;
  return "";
}

export function parseInstagramCrawlerHtml(html: string, pageUrl: string): InstagramMeta {
  const og = parseInstagramOgTitle(
    html.match(/property="og:title"\s+content="([^"]+)"/i)?.[1] ||
      html.match(/content="([^"]+)"\s+property="og:title"/i)?.[1] ||
      ""
  );
  const shared = parseInstagramSharedBy(html);
  const videoUrl = parseInstagramVideoUrl(html);
  const fromUrl = instagramMediaKindFromUrl(pageUrl);
  const mediaKind = videoUrl ? "video" : fromUrl || "image";
  return {
    pageName: og.pageName || shared.pageName,
    username: parseInstagramUsername(html) || shared.username,
    caption: og.caption,
    imageUrl: parseInstagramImageUrl(html),
    videoUrl,
    mediaKind,
  };
}

function parseOembed(data: {
  title?: string;
  author_name?: string;
  thumbnail_url?: string;
  html?: string;
}) {
  const shared = parseInstagramSharedBy(data.html || "");
  return {
    pageName: shared.pageName,
    username: shared.username || data.author_name || "",
    caption: (data.title || "").trim(),
    imageUrl: data.thumbnail_url || null,
  };
}

async function downloadCrawlerHtml(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "text/html",
      "User-Agent": CRAWLER_UA,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return "";
  return (await res.text()).slice(0, 1_200_000);
}

async function downloadOembed(url: string) {
  const res = await fetch(
    `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url)}`,
    {
      headers: { Accept: "application/json", "User-Agent": CRAWLER_UA },
      signal: AbortSignal.timeout(8_000),
    }
  );
  if (!res.ok) return null;
  return (await res.json()) as {
    title?: string;
    author_name?: string;
    thumbnail_url?: string;
    html?: string;
  };
}

export async function fetchInstagramMeta(raw: string): Promise<InstagramMeta | null> {
  const url = instagramPostUrl(raw);
  if (!url) return null;

  let meta = parseInstagramCrawlerHtml("", url);
  try {
    const html = await downloadCrawlerHtml(url);
    if (html.includes("og:title") || html.includes("video_versions")) {
      meta = parseInstagramCrawlerHtml(html, url);
    }
  } catch {
    /* tenta oEmbed */
  }

  if (!meta.pageName || !meta.username || !meta.imageUrl) {
    try {
      const oembed = await downloadOembed(url);
      if (oembed) {
        const extra = parseOembed(oembed);
        meta = {
          ...meta,
          pageName: meta.pageName || extra.pageName,
          username: meta.username || extra.username,
          caption: meta.caption || extra.caption,
          imageUrl: meta.imageUrl || extra.imageUrl,
        };
      }
    } catch {
      /* mantém o que já tem */
    }
  }

  if (!meta.pageName && !meta.username && !meta.imageUrl && !meta.videoUrl) {
    return {
      ...meta,
      mediaKind: instagramMediaKindFromUrl(url) || "image",
    };
  }
  return meta;
}

export async function enrichInstagramItem(item: NewsItem): Promise<NewsItem> {
  const url = instagramPostUrl(item.url);
  if (!url) return item;
  const fallbackKind = instagramMediaKindFromUrl(url) || "image";
  const meta = await fetchInstagramMeta(url);
  if (!meta) {
    return {
      ...item,
      url,
      kind: "instagram",
      mediaKind: item.mediaKind || fallbackKind,
      videoUrl: fallbackKind === "video" ? item.videoUrl || url : null,
    };
  }

  const source = formatInstagramSource(meta);
  return {
    ...item,
    url,
    kind: "instagram",
    source: source || item.source,
    title: item.title || meta.caption || item.title,
    summary: item.summary || meta.caption || item.summary,
    imageUrl: meta.imageUrl || item.imageUrl,
    videoUrl: meta.mediaKind === "video" ? meta.videoUrl || url : null,
    mediaKind: meta.mediaKind,
  };
}

export async function enrichInstagramNews(items: NewsItem[]): Promise<NewsItem[]> {
  return mapNewsPool(items, 4, async (item) => {
    if (item.kind !== "instagram" && !instagramPostUrl(item.url)) return item;
    try {
      return await enrichInstagramItem(item);
    } catch {
      return item;
    }
  });
}
