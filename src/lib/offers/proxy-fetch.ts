import { ProxyAgent, fetch as proxyFetch } from "undici";
import type { OfferProxy } from "@/lib/offers/proxy-parse";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export const META_CRAWLER_UA =
  "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)";

export async function fetchThroughProxy(
  proxy: OfferProxy,
  url: string,
  init: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    timeoutMs?: number;
    userAgent?: string;
  } = {}
) {
  const agent = new ProxyAgent(proxy.href);
  const res = await proxyFetch(url, {
    dispatcher: agent,
    method: init.method || "GET",
    headers: {
      Accept: "text/html,application/json,*/*",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      "User-Agent": init.userAgent || BROWSER_UA,
      ...init.headers,
    },
    body: init.body,
    signal: AbortSignal.timeout(init.timeoutMs ?? 20_000),
  });
  const text = await res.text();
  return { status: res.status, text, headers: res.headers };
}
