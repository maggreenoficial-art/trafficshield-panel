import { fetchArticleMedia } from "@/lib/news/article";
import { decodeGoogleNewsUrls, isGoogleNewsUrl, mapNewsPool } from "@/lib/news/google-url";
import { mergeNews, parseRssItems } from "@/lib/news/parse-rss";
import type { NewsItem } from "@/lib/news/types";

function isNoise(item: NewsItem) {
  const source = item.source.toLowerCase();
  const title = item.title.toLowerCase();
  if (source.includes("cbn amaz")) return true;
  if (/vereador\s+\d{4}/.test(title)) return true;
  return false;
}

const FEEDS = [
  "https://news.google.com/rss/search?q=Cassil%C3%A2ndia%20OR%20Cassilandia&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  "https://www.cassilandianoticias.com.br/feed",
  "https://diariodecassilandia.com.br/feed",
];

const CACHE_MS = 8 * 60 * 1000;

const cache = globalThis as typeof globalThis & {
  __cassilandiaNewsV2?: { at: number; items: NewsItem[] };
};

async function downloadFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "application/rss+xml, application/xml, text/xml, */*",
      "User-Agent": "Mozilla/5.0 (compatible; NoratNews/1.0)",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) throw new Error(`Feed ${res.status}`);
  return (await res.text()).slice(0, 800_000);
}

async function withPublisherUrls(items: NewsItem[]): Promise<NewsItem[]> {
  const decoded = await decodeGoogleNewsUrls(items.map((item) => item.url));
  return items.map((item) => {
    const url = decoded.get(item.url);
    return url ? { ...item, url } : item;
  });
}

async function withArticleMedia(items: NewsItem[]): Promise<NewsItem[]> {
  return mapNewsPool(items, 6, async (item) => {
    if ((item.imageUrl && item.videoUrl) || isGoogleNewsUrl(item.url)) return item;
    const media = await fetchArticleMedia(item.url);
    return {
      ...item,
      imageUrl: item.imageUrl || media.imageUrl,
      videoUrl: item.videoUrl || media.videoUrl,
    };
  });
}

export async function fetchCassilandiaNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (cache.__cassilandiaNewsV2 && now - cache.__cassilandiaNewsV2.at < CACHE_MS) {
    return cache.__cassilandiaNewsV2.items;
  }

  const lists = await Promise.all(
    FEEDS.map(async (url) => {
      try {
        return parseRssItems(await downloadFeed(url));
      } catch {
        return [] as NewsItem[];
      }
    })
  );

  let items = mergeNews(lists)
    .filter((item) => !isNoise(item))
    .slice(0, 40);
  if (!items.length) {
    throw new Error(
      "Nenhuma notícia de Cassilândia MS chegou agora. Tente de novo em alguns minutos."
    );
  }

  try {
    items = await withPublisherUrls(items);
  } catch {
    /* keep Google URLs */
  }
  try {
    items = await withArticleMedia(items);
  } catch {
    /* keep RSS media */
  }

  cache.__cassilandiaNewsV2 = { at: now, items };
  return items;
}
