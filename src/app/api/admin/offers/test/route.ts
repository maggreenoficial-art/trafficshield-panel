import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getOfferConfig } from "@/lib/db/offer-scrape";
import { parseOfferProxyList, summarizeProxy } from "@/lib/offers/proxy-parse";
import { testOfferProxy } from "@/lib/offers/scrape";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const config = await getOfferConfig();
    const proxies = parseOfferProxyList(config.proxies.join("\n")).slice(0, 12);
    const results = [];
    for (const proxy of proxies) {
      try {
        const ip = await testOfferProxy(proxy);
        results.push({ host: summarizeProxy(proxy), ok: true, ip });
      } catch (error) {
        results.push({
          host: summarizeProxy(proxy),
          ok: false,
          error: error instanceof Error ? error.message : "Falhou",
        });
      }
    }
    return NextResponse.json({ results, ok: results.filter((item) => item.ok).length });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha no teste.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
