import { adLibrarySearchUrl, parseAdLibraryPage } from "@/lib/offers/ad-library";
import { fetchThroughProxy, META_CRAWLER_UA } from "@/lib/offers/proxy-fetch";
import type { OfferProxy } from "@/lib/offers/proxy-parse";
import { summarizeProxy } from "@/lib/offers/proxy-parse";
import type { MetaAd, OfferMediaType } from "@/lib/offers/types";

export type AdLibrarySearchType = "keyword_unordered" | "keyword_exact_phrase";

export async function scrapeMetaAds(input: {
  keywords: string;
  country: string;
  mediaType: OfferMediaType;
  proxies: OfferProxy[];
  searchType?: AdLibrarySearchType;
}): Promise<{
  ads: MetaAd[];
  proxy: string | null;
  searched: number;
  total: number | null;
}> {
  const keywords = input.keywords.trim().slice(0, 100);
  if (!keywords) throw new Error("Digite o tema ou as palavras-chave.");
  if (!input.proxies.length) {
    throw new Error("Coloque os proxies da Proxy-Seller antes de buscar.");
  }

  const url = adLibrarySearchUrl({
    keywords,
    country: input.country || "BR",
    mediaType: input.mediaType || "all",
    searchType: input.searchType || "keyword_exact_phrase",
  });

  let lastError = "A Meta não devolveu anúncios.";
  const order = [...input.proxies];
  const start = Math.floor(Math.random() * order.length);
  const rotated = [...order.slice(start), ...order.slice(0, start)];

  for (const proxy of rotated.slice(0, Math.min(6, rotated.length))) {
    try {
      const res = await fetchThroughProxy(proxy, url, {
        userAgent: META_CRAWLER_UA,
        timeoutMs: 25_000,
      });
      if (res.status >= 400 && res.text.includes("executeChallenge")) {
        lastError = `Proxy ${summarizeProxy(proxy)} caiu no desafio da Meta.`;
        continue;
      }
      if (res.status >= 400) {
        lastError = `Proxy ${summarizeProxy(proxy)}: HTTP ${res.status}.`;
        continue;
      }
      const page = parseAdLibraryPage(res.text);
      if (page.ads.length) {
        return {
          ads: page.ads,
          proxy: summarizeProxy(proxy),
          searched: page.ads.length,
          total: page.total,
        };
      }
      return {
        ads: [],
        proxy: summarizeProxy(proxy),
        searched: 0,
        total: page.total ?? 0,
      };
    } catch (error) {
      lastError =
        error instanceof Error
          ? `Proxy ${summarizeProxy(proxy)}: ${error.message}`
          : lastError;
    }
  }

  throw new Error(lastError);
}

export async function scrapeMetaAdQueries(input: {
  queries: { keywords: string; searchType: AdLibrarySearchType }[];
  country: string;
  mediaType: OfferMediaType;
  proxies: OfferProxy[];
}): Promise<{
  ads: MetaAd[];
  proxy: string | null;
  searched: number;
  total: number | null;
}> {
  const seen = new Set<string>();
  const ads: MetaAd[] = [];
  let proxy: string | null = null;
  let total: number | null = null;
  const queries = input.queries.filter((item) => item.keywords.trim()).slice(0, 4);
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    const start = i % Math.max(input.proxies.length, 1);
    const rotated = [...input.proxies.slice(start), ...input.proxies.slice(0, start)];
    try {
      const result = await scrapeMetaAds({
        keywords: query.keywords,
        country: input.country,
        mediaType: input.mediaType,
        proxies: rotated.slice(0, Math.min(2, rotated.length)),
        searchType: query.searchType,
      });
      if (result.proxy) proxy = result.proxy;
      if (result.total != null) total = Math.max(total ?? 0, result.total);
      for (const ad of result.ads) {
        if (seen.has(ad.id)) continue;
        seen.add(ad.id);
        ads.push(ad);
      }
      if (ads.length >= 55) break;
    } catch {
      continue;
    }
  }
  return { ads, proxy, searched: ads.length, total };
}

export async function testOfferProxy(proxy: OfferProxy) {
  const res = await fetchThroughProxy(proxy, "https://api.ipify.org?format=json", {
    timeoutMs: 12_000,
    userAgent: "Mozilla/5.0",
  });
  if (res.status >= 400) {
    throw new Error(`HTTP ${res.status}`);
  }
  const data = JSON.parse(res.text) as { ip?: string };
  if (!data.ip) throw new Error("Sem IP de saída.");
  return data.ip;
}
