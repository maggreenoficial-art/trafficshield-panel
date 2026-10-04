import { createHash } from "node:crypto";
import type { NewsItem } from "@/lib/news/types";

export function youtubeVideoId(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0] ?? "";
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const fromQuery = url.searchParams.get("v") ?? "";
      if (/^[\w-]{11}$/.test(fromQuery)) return fromQuery;
      const parts = url.pathname.split("/").filter(Boolean);
      const embed = parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live";
      const id = embed ? (parts[1] ?? "") : "";
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
  } catch {
    const match = raw.match(/(?:youtube\.com\/(?:embed\/|shorts\/|live\/|watch\?v=)|youtu\.be\/)([\w-]{11})/);
    return match?.[1] ?? null;
  }
  return null;
}

export function instagramPostUrl(raw: string): string | null {
  try {
    const url = new URL(raw.trim());
    if (!url.hostname.endsWith("instagram.com")) return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const kindIndex = parts.findIndex((part) => part === "reel" || part === "p" || part === "tv");
    const code = kindIndex >= 0 ? parts[kindIndex + 1] : "";
    if (!code || !/^[A-Za-z0-9_-]+$/.test(code)) return null;
    return `https://www.instagram.com/${parts[kindIndex]}/${code}/`;
  } catch {
    return null;
  }
}

export function extractSocialVideoUrls(html: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /https?:\/\/(?:www\.)?(?:youtube\.com\/(?:embed\/|shorts\/|watch\?v=)|youtu\.be\/)[\w-]{11}/gi,
    /https?:\/\/(?:www\.)?instagram\.com\/(?:reel|p|tv)\/[A-Za-z0-9_-]+/gi,
    /https?:\/\/(?:www\.)?(?:facebook\.com\/(?:reel|watch|share)\/[^\s"'<>]+|fb\.watch\/[^\s"'<>]+)/gi,
    /https?:\/\/(?:www\.)?tiktok\.com\/@[^\s"'<>]+\/video\/\d+/gi,
  ];
  for (const pattern of patterns) {
    for (const match of html.match(pattern) ?? []) {
      const youtube = youtubeVideoId(match);
      if (youtube) {
        found.add(`https://www.youtube.com/watch?v=${youtube}`);
        continue;
      }
      const instagram = instagramPostUrl(match);
      if (instagram) {
        found.add(instagram);
        continue;
      }
      try {
        found.add(new URL(match).toString());
      } catch {
        /* skip */
      }
    }
  }
  return [...found];
}

export function youtubeWatchUrl(id: string) {
  return `https://www.youtube.com/watch?v=${id}`;
}

export function youtubeThumbUrl(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function newsId(url: string) {
  return createHash("sha1").update(url).digest("hex").slice(0, 16);
}

export function newsItemFromYoutube(input: {
  id: string;
  title: string;
  channel: string;
  publishedAt?: string | null;
  summary?: string;
}): NewsItem {
  const url = youtubeWatchUrl(input.id);
  return {
    id: newsId(url),
    title: input.title.slice(0, 220),
    source: (input.channel || "YouTube").slice(0, 80),
    url,
    publishedAt: input.publishedAt ?? null,
    summary: (input.summary || "").slice(0, 420),
    imageUrl: youtubeThumbUrl(input.id),
    videoUrl: url,
    kind: "youtube",
  };
}

export function newsItemFromInstagram(input: {
  url: string;
  title?: string;
  summary?: string;
  publishedAt?: string | null;
}): NewsItem | null {
  const url = instagramPostUrl(input.url);
  if (!url) return null;
  return {
    id: newsId(url),
    title: (input.title || "Vídeo no Instagram").slice(0, 220),
    source: "Instagram",
    url,
    publishedAt: input.publishedAt ?? null,
    summary: (input.summary || "Post público do Instagram sobre Cassilândia.").slice(0, 420),
    imageUrl: null,
    videoUrl: url,
    kind: "instagram",
  };
}

function extractJsonObject(source: string, from: number): unknown | null {
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = from; i < source.length; i++) {
    const ch = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth += 1;
    else if (ch === "}") {
      depth -= 1;
      if (depth === 0) {
        try {
          return JSON.parse(source.slice(from, i + 1)) as unknown;
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export function parseYoutubeSearchHtml(html: string): NewsItem[] {
  const marker = html.indexOf("ytInitialData");
  const from = marker >= 0 ? html.indexOf("{", marker) : -1;
  const data = from >= 0 ? extractJsonObject(html, from) : null;
  if (!data) return [];
  const items: NewsItem[] = [];
  const seen = new Set<string>();

  const visit = (node: unknown) => {
    if (!node || typeof node !== "object") return;
    const record = node as Record<string, unknown>;
    const renderer = record.videoRenderer as Record<string, unknown> | undefined;
    if (renderer && typeof renderer.videoId === "string" && /^[\w-]{11}$/.test(renderer.videoId)) {
      if (!seen.has(renderer.videoId)) {
        seen.add(renderer.videoId);
        const title =
          textFrom(renderer.title) ||
          textFrom((renderer.headline as Record<string, unknown> | undefined) ?? {});
        const channel = textFrom(renderer.ownerText) || "YouTube";
        if (title) {
          items.push(
            newsItemFromYoutube({
              id: renderer.videoId,
              title,
              channel,
              publishedAt: null,
              summary: textFrom(renderer.descriptionSnippet),
            })
          );
        }
      }
    }
    for (const value of Object.values(record)) {
      if (value && typeof value === "object") visit(value);
    }
  };
  visit(data);
  return items;
}

function textFrom(value: unknown): string {
  if (!value || typeof value !== "object") return "";
  const record = value as Record<string, unknown>;
  if (typeof record.simpleText === "string") return record.simpleText;
  const runs = record.runs;
  if (Array.isArray(runs)) {
    return runs
      .map((run) => (run && typeof run === "object" && "text" in run ? String(run.text) : ""))
      .join("");
  }
  return "";
}
