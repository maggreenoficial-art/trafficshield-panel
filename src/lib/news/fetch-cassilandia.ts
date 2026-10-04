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
  __cassilandiaNews?: { at: number; items: NewsItem[] };
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

export async function fetchCassilandiaNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (cache.__cassilandiaNews && now - cache.__cassilandiaNews.at < CACHE_MS) {
    return cache.__cassilandiaNews.items;
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

  const items = mergeNews(lists)
    .filter((item) => !isNoise(item))
    .slice(0, 40);
  if (!items.length) {
    throw new Error(
      "Nenhuma notícia de Cassilândia MS chegou agora. Tente de novo em alguns minutos."
    );
  }

  cache.__cassilandiaNews = { at: now, items };
  return items;
}
