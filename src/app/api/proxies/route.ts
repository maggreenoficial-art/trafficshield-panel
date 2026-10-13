import { NextResponse, type NextRequest } from "next/server";
import { getOfferConfig } from "@/lib/db/offer-scrape";
import { getReportConfig } from "@/lib/db/reports";
import { downloadProxySellerList } from "@/lib/offers/proxy-seller";
import {
  feedProxiesFromLines,
  proxyFeedAuthorized,
  proxyFeedKey,
} from "@/lib/reports/proxy-feed";
import { reportProxyLines } from "@/lib/reports/proxies";

export const maxDuration = 30;

export async function GET(request: NextRequest) {
  if (!proxyFeedKey()) {
    return NextResponse.json(
      { error: "A chave desta API ainda não foi configurada." },
      { status: 503 }
    );
  }
  if (
    !proxyFeedAuthorized(
      request.headers.get("authorization"),
      request.headers.get("x-api-key")
    )
  ) {
    return NextResponse.json({ error: "Chave inválida." }, { status: 401 });
  }

  try {
    const stored = await getReportConfig();
    let lines = reportProxyLines(stored.proxies.join("\n"));
    if (!lines.length) {
      const offers = await getOfferConfig();
      lines = reportProxyLines(await downloadProxySellerList(offers.apiKey));
    }
    const proxies = feedProxiesFromLines(lines);
    if (!proxies.length) {
      return NextResponse.json({ error: "Nenhum proxy disponível." }, { status: 404 });
    }
    return NextResponse.json({ count: proxies.length, proxies });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao entregar os proxies.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
