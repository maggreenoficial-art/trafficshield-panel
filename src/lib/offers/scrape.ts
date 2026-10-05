import { adLibrarySearchUrl, parseAdLibraryPage } from "@/lib/offers/ad-library";
import { fetchThroughProxy, META_CRAWLER_UA } from "@/lib/offers/proxy-fetch";
import type { OfferProxy } from "@/lib/offers/proxy-parse";
import { summarizeProxy } from "@/lib/offers/proxy-parse";
import type { MetaAd, OfferMediaType } from "@/lib/offers/types";

export async function scrapeMetaAds(input: {
  keywords: string;
  country: string;
  mediaType: OfferMediaType;
  proxies: OfferProxy[];
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
  });

  let lastError = "A Meta não devolveu anúncios.";
  let emptyOk: { proxy: string; total: number | null } | null = null;
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
      lastError = `Proxy ${summarizeProxy(proxy)} abriu a biblioteca, mas sem anúncio neste tema.`;
      emptyOk = { proxy: summarizeProxy(proxy), total: page.total };
    } catch (error) {
      lastError =
        error instanceof Error
          ? `Proxy ${summarizeProxy(proxy)}: ${error.message}`
          : lastError;
    }
  }

  if (emptyOk) {
    return {
      ads: [],
      proxy: emptyOk.proxy,
      searched: 0,
      total: emptyOk.total ?? 0,
    };
  }

  throw new Error(lastError);
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
