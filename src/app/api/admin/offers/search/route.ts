import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getOfferConfig, saveOfferConfig } from "@/lib/db/offer-scrape";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { scrapeMetaAds } from "@/lib/offers/scrape";
import type { OfferMediaType } from "@/lib/offers/types";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      keywords?: string;
      country?: string;
      mediaType?: OfferMediaType;
    };
    const current = await getOfferConfig();
    const keywords = (body.keywords ?? current.keywords).trim();
    const country = (body.country ?? current.country).trim() || "BR";
    const mediaType = body.mediaType ?? current.mediaType;
    const config = await saveOfferConfig({
      ...current,
      keywords,
      country,
      mediaType,
    });
    const proxies = parseOfferProxyList(config.proxies.join("\n"));
    const result = await scrapeMetaAds({
      keywords,
      country,
      mediaType,
      proxies,
    });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha na busca.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
