import { fetchArticleMedia } from "@/lib/news/article";
import { decodeGoogleNewsUrls, isGoogleNewsUrl, mapNewsPool } from "@/lib/news/google-url";
import { isCassilandiaNews, mergeNews, parseRssItems } from "@/lib/news/parse-rss";
import { newsItemFromInstagram } from "@/lib/news/social";
import type { NewsItem } from "@/lib/news/types";
import { fetchCassilandiaYoutube } from "@/lib/news/youtube";

function isNoise(item: NewsItem) {
  const source = item.source.toLowerCase();
  const title = item.title.toLowerCase();
  if (source.includes("cbn amaz")) return true;
  if (/vereador\s+\d{4}/.test(title)) return true;
  return false;
}

const FEEDS = [
  "https://news.google.com/rss/search?q=Cassil%C3%A2ndia%20OR%20Cassilandia&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  "https://news.google.com/rss/search?q=Cassil%C3%A2ndia+(v%C3%ADdeo+OR+video+OR+reel+OR+instagram)&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  "https://www.cassilandianoticias.com.br/feed",
  "https://diariodecassilandia.com.br/feed",
];

const CACHE_MS = 8 * 60 * 1000;

const cache = globalThis as typeof globalThis & {
  __cassilandiaNewsV4?: { at: number; items: NewsItem[] };
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
        summary: `Vídeo no Instagram sobre: ${item.title}`,
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

function sortNews(items: NewsItem[]) {
  return [...items].sort((a, b) => {
    const va = a.videoUrl ? 1 : 0;
    const vb = b.videoUrl ? 1 : 0;
    if (va !== vb) return vb - va;
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });
}

export async function fetchCassilandiaNews(): Promise<NewsItem[]> {
  const now = Date.now();
  if (cache.__cassilandiaNewsV4 && now - cache.__cassilandiaNewsV4.at < CACHE_MS) {
    return cache.__cassilandiaNewsV4.items;
  }

  const youtube = await fetchCassilandiaYoutube().catch(() => [] as NewsItem[]);

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

  let instagram: NewsItem[] = [];
  try {
    const enriched = await withArticleMedia(items);
    items = enriched.items;
    instagram = enriched.instagram;
  } catch {
    /* keep RSS media */
  }

  items = sortNews(
    mergeNews([items, youtube, instagram]).filter(
      (item) =>
        !isNoise(item) &&
        (item.kind === "youtube" || item.kind === "instagram" || isCassilandiaNews(item))
    )
  ).slice(0, 48);

  cache.__cassilandiaNewsV4 = { at: now, items };
  return items;
}
