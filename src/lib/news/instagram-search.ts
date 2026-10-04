import { isRecentNews } from "@/lib/news/dates";
import { decodeGoogleNewsUrls } from "@/lib/news/google-url";
import { isCassilandiaNews, mergeNews, parseRssItems } from "@/lib/news/parse-rss";
import { newsItemFromInstagram } from "@/lib/news/social";
import type { NewsItem } from "@/lib/news/types";

const FEEDS = [
  "https://news.google.com/rss/search?q=site:instagram.com+(Cassil%C3%A2ndia+OR+Cassilandia)+when:14d&hl=pt-BR&gl=BR&ceid=BR:pt-419",
  "https://news.google.com/rss/search?q=site:instagram.com+(Cassil%C3%A2ndia+OR+Cassilandia)&hl=pt-BR&gl=BR&ceid=BR:pt-419",
];

async function downloadFeed(url: string) {
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

export async function fetchCassilandiaInstagram(): Promise<NewsItem[]> {
  const lists = await Promise.all(
    FEEDS.map(async (url) => {
      try {
        return parseRssItems(await downloadFeed(url));
      } catch {
        return [] as NewsItem[];
      }
    })
  );

  const candidates = mergeNews(lists)
    .filter((item) => isCassilandiaNews(item))
    .slice(0, 30);
  if (!candidates.length) return [];

  const decoded = await decodeGoogleNewsUrls(candidates.map((item) => item.url));
  const posts: NewsItem[] = [];
  const seen = new Set<string>();

  for (const item of candidates) {
    const post = newsItemFromInstagram({
      url: decoded.get(item.url) ?? item.url,
      title: item.title,
      summary: item.summary || "Post do Instagram sobre Cassilândia.",
      publishedAt: item.publishedAt,
    });
    if (!post || seen.has(post.id)) continue;
    seen.add(post.id);
    posts.push(post);
  }

  const recent = posts.filter((item) => isRecentNews(item.publishedAt));
  return (recent.length >= 6 ? recent : posts).slice(0, 20);
}
