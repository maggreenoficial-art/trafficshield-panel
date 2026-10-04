import { fetchArticleMedia } from "@/lib/news/article";
import { isRecentNews } from "@/lib/news/dates";
import { decodeGoogleNewsUrls, isGoogleNewsUrl, mapNewsPool } from "@/lib/news/google-url";
import { isCassilandiaNews, mergeNews, parseRssItems } from "@/lib/news/parse-rss";
import { newsItemFromInstagram } from "@/lib/news/social";
import type { NewsItem } from "@/lib/news/types";

function isNoise(item: NewsItem) {
  const source = item.source.toLowerCase();
  const title = item.title.toLowerCase();
  if (source.includes("cbn amaz")) return true;
  if (/vereador\s+\d{4}/.test(title)) return true;
  return false;
}

const FEEDS = [
  "https://news.google.com/rss/search?q=Cassil%C3%A2ndia+when:7d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  "https://news.google.com/rss/search?q=Cassilandia+when:7d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  "https://news.google.com/rss/search?q=Cassil%C3%A2ndia+(instagram+OR+reel)+when:14d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  "https://www.cassilandianoticias.com.br/feed",
  "https://diariodecassilandia.com.br/feed",
];

const CACHE_MS = 8 * 60 * 1000;

const cache = globalThis as typeof globalThis & {
  __cassilandiaNewsV5?: { at: number; items: NewsItem[] };
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

async function withArticleMedia(items: NewsItem[]): Promise<{
  items: NewsItem[];
  instagram: NewsItem[];
}> {
  const instagram: NewsItem[] = [];
  const seenIg = new Set<string>();
  const next = await mapNewsPool(items, 6, async (item) => {
    if ((item.imageUrl && item.videoUrl) || isGoogleNewsUrl(item.url)) return item;
    const media = await fetchArticleMedia(item.url);
    for (const social of media.socialUrls) {
      const post = newsItemFromInstagram({
        url: social,
        title: item.title,
        summary: `No Instagram · ${item.source}`,
        publishedAt: item.publishedAt,
      });
      if (post && !seenIg.has(post.id)) {
        seenIg.add(post.id);
        instagram.push(post);
      }
    }
    return {
      ...item,
      imageUrl: item.imageUrl || media.imageUrl,
      videoUrl: item.videoUrl || media.videoUrl,
    };
  });
  return { items: next, instagram };
}

function keepFresh(items: NewsItem[]) {
  const recent = items.filter(
    (item) => item.kind === "instagram" || isRecentNews(item.publishedAt)
  );
  if (recent.length >= 8) return recent;
  return items.slice(0, 20);
}

export async function fetchCassilandiaNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (cache.__cassilandiaNewsV5 && now - cache.__cassilandiaNewsV5.at < CACHE_MS) {
    return cache.__cassilandiaNewsV5.items;
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

  let items = mergeNews(lists).filter((item) => !isNoise(item) && isCassilandiaNews(item));
  if (!items.length) {
    throw new Error(
      "Nenhuma notícia recente de Cassilândia MS chegou agora. Tente de novo em alguns minutos."
    );
  }

  try {
    items = await withPublisherUrls(items);
  } catch {
    /* keep Google URLs */
  }

  let instagram: NewsItem[] = [];
  try {
    const enriched = await withArticleMedia(keepFresh(items).slice(0, 40));
    items = enriched.items;
    instagram = enriched.instagram;
  } catch {
    items = keepFresh(items).slice(0, 40);
  }

  items = mergeNews([items, instagram]).filter((item) => !isNoise(item));
  items = keepFresh(items).slice(0, 40);

  cache.__cassilandiaNewsV5 = { at: now, items };
  return items;
}
