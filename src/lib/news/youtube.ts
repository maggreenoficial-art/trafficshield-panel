import { NEWS_BROWSER_UA } from "@/lib/news/article";
import { isCassilandiaNews } from "@/lib/news/parse-rss";
import {
  newsItemFromYoutube,
  parseYoutubeSearchHtml,
  youtubeThumbUrl,
  youtubeVideoId,
} from "@/lib/news/social";
import type { NewsItem } from "@/lib/news/types";

function isNewsVideo(item: NewsItem) {
  const title = item.title.toLowerCase();
  if (/festa do pe[aã]o|tour a[eé]reo|atravessei a cidade|transa?miss[aã]o 54/i.test(title)) {
    return false;
  }
  return isCassilandiaNews(item);
}

export async function fetchCassilandiaYoutube(): Promise<NewsItem[]> {
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent("Cassilândia MS notícia")}&hl=pt-BR&gl=BR`,
      {
        headers: {
          Accept: "text/html",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "User-Agent": NEWS_BROWSER_UA,
        },
        signal: AbortSignal.timeout(12_000),
      }
    );
    if (!res.ok) return [];
    const html = await res.text();
    const parsed = parseYoutubeSearchHtml(html);
    const seen = new Set<string>();
    const items: NewsItem[] = [];
    for (const item of parsed) {
      if (seen.has(item.id) || !isNewsVideo(item)) continue;
      seen.add(item.id);
      items.push(item);
      if (items.length >= 12) break;
    }
    return items;
  } catch {
    return [];
  }
}

export async function resolveYoutubeNews(rawUrl: string): Promise<NewsItem | null> {
  const id = youtubeVideoId(rawUrl);
  if (!id) return null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}&format=json`,
      { signal: AbortSignal.timeout(8_000) }
    );
    if (res.ok) {
      const data = (await res.json()) as { title?: string; author_name?: string };
      return newsItemFromYoutube({
        id,
        title: data.title || "Vídeo do YouTube",
        channel: data.author_name || "YouTube",
      });
    }
  } catch {
    /* fallback below */
  }
  return newsItemFromYoutube({
    id,
    title: "Vídeo do YouTube",
    channel: "YouTube",
    summary: "",
  });
}

export { youtubeThumbUrl };
