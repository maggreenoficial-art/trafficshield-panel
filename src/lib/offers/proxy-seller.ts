import { parseOfferProxyList, type OfferProxy } from "@/lib/offers/proxy-parse";

const BASE = "https://proxy-seller.com/personal/api/v1";

export function proxySellerKey() {
  return process.env.PROXY_SELLER_API_KEY?.trim() || "";
}

export function envOfferProxies(): OfferProxy[] {
  return parseOfferProxyList(process.env.PROXY_SELLER_PROXIES || "");
}

export async function downloadProxySellerList(apiKey: string): Promise<string> {
  const key = apiKey.trim() || proxySellerKey();
  if (!key) throw new Error("Coloque a API key da Proxy-Seller.");
  const url = `${BASE}/${encodeURIComponent(key)}/proxy/download/resident?ext=txt`;
  const res = await fetch(url, {
    headers: { Accept: "text/plain, application/json, */*" },
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Proxy-Seller respondeu HTTP ${res.status}.`);
  }
  if (text.trim().startsWith("{")) {
    try {
      const json = JSON.parse(text) as { errors?: { message?: string }[] };
      const msg = json.errors?.[0]?.message;
      if (msg) throw new Error(msg);
    } catch (error) {
      if (error instanceof Error && !error.message.includes("JSON")) throw error;
    }
    throw new Error("A Proxy-Seller não devolveu a lista de IPs.");
  }
  return text;
}
