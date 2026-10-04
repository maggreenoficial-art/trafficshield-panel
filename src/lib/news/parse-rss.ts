import { createHash } from "node:crypto";
import type { NewsItem } from "@/lib/news/types";

function decodeXml(value: string) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripHtml(value: string) {
  return decodeXml(value)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function firstTag(block: string, name: string) {
  const match = block.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
  return match ? decodeXml(match[1]) : "";
}

function attr(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}=["']([^"']+)`, "i"));
  return match?.[1] ?? "";
}

function firstHref(html: string) {
  const match = html.match(/<a[^>]+href=["']([^"']+)/i);
  return match?.[1] ?? "";
}

function firstImg(html: string) {
  const match = html.match(/<img[^>]+src=["']([^"']+)/i);
  return match?.[1] ?? "";
}

function enclosureUrl(block: string, kind: "image" | "video") {
  const tags = block.match(/<(?:enclosure|media:content|media:thumbnail)\b[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const url = attr(tag, "url") || attr(tag, "href");
    const type = attr(tag, "type").toLowerCase();
    const medium = attr(tag, "medium").toLowerCase();
    if (kind === "image") {
      if (type.startsWith("image/") || medium === "image" || /\.(jpe?g|png|webp)(\?|$)/i.test(url)) {
        return url;
      }
    } else if (
      type.startsWith("video/") ||
      medium === "video" ||
      /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url)
    ) {
      return url;
    }
  }
  return "";
}

function stripSourceSuffix(title: string, source: string) {
  const trimmed = title.trim();
  const suffix = source.trim();
  if (!suffix) return trimmed;
  if (trimmed.toLowerCase().endsWith(suffix.toLowerCase())) {
    return trimmed
      .slice(0, trimmed.length - suffix.length)
      .replace(/[\s|—–-]+$/g, "")
      .trim();
  }
  return trimmed;
}

function newsId(url: string) {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

function readableUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname.endsWith("news.google.com") &&
      parsed.pathname.includes("/rss/articles/")
    ) {
      parsed.pathname = parsed.pathname.replace("/rss/articles/", "/articles/");
      return parsed.toString();
    }
  } catch {
    /* keep original */
  }
  return url;
}

export function isCassilandiaNews(item: Pick<NewsItem, "title" | "source" | "summary">) {
  const blob = `${item.title} ${item.source} ${item.summary}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return blob.includes("cassilandia") || /\bcassil/.test(blob);
}

export function parseRssItems(xml: string): NewsItem[] {
  const items: NewsItem[] = [];
  const blocks = xml.match(/<item\b[\s\S]*?<\/item>/gi) ?? [];

  for (const block of blocks) {
    const rawTitle = stripHtml(firstTag(block, "title"));
    const sourceTag = block.match(/<source\b[^>]*>[\s\S]*?<\/source>/i)?.[0] ?? "";
    const source =
      stripHtml(firstTag(block, "source")) ||
      stripHtml(attr(sourceTag, "url")).replace(/^https?:\/\//, "").split("/")[0] ||
      "Portal";
    const title = stripSourceSuffix(rawTitle, source);
    const description = firstTag(block, "description");
    const linkFromHtml = firstHref(description);
    const itemLink = firstTag(block, "link") || firstTag(block, "guid");
    const url = readableUrl(
      (linkFromHtml.startsWith("http") ? linkFromHtml : itemLink).trim()
    );
    if (!title || !url.startsWith("http")) continue;

    const image = firstImg(description) || enclosureUrl(block, "image");
    const video = enclosureUrl(block, "video");
    items.push({
      id: newsId(url),
      title: title.slice(0, 220),
      source: source.slice(0, 80) || "Portal",
      url,
      publishedAt: firstTag(block, "pubDate") || null,
      summary: stripHtml(description).slice(0, 420),
      imageUrl: image.startsWith("http") ? image : null,
      videoUrl: video.startsWith("http") ? video : null,
    });
  }

  return items;
}

function newsDedupeKey(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = parsed.searchParams.get("v");
      if (id) return `youtube:${id.toLowerCase()}`;
    }
    if (host === "youtu.be") {
      const id = parsed.pathname.split("/").filter(Boolean)[0];
      if (id) return `youtube:${id.toLowerCase()}`;
    }
    return parsed.toString().replace(/[?#].*$/, "").toLowerCase();
  } catch {
    return url.replace(/[?#].*$/, "").toLowerCase();
  }
}

export function mergeNews(lists: NewsItem[][]): NewsItem[] {
  const seen = new Set<string>();
  const merged: NewsItem[] = [];
  for (const list of lists) {
    for (const item of list) {
      const key = newsDedupeKey(item.url);
      if (seen.has(key) || seen.has(item.id)) continue;
      seen.add(key);
      seen.add(item.id);
      merged.push(item);
    }
  }
  return merged.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
}
