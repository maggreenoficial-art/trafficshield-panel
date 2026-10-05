import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getOfferConfig, saveOfferConfig } from "@/lib/db/offer-scrape";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { searchOfferLibrary } from "@/lib/offers/search";
import type { OfferMediaType } from "@/lib/offers/types";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      keywords?: string;
      country?: string;
      mediaType?: OfferMediaType;
      hunt?: boolean;
    };
    const current = await getOfferConfig();
    const hunt = Boolean(body.hunt) || !(body.keywords ?? current.keywords).trim();
    const keywords = hunt ? (body.keywords ?? "").trim() : (body.keywords ?? current.keywords).trim();
    const country = (body.country ?? current.country).trim() || "BR";
    const mediaType = body.mediaType ?? current.mediaType;
    const config = hunt
      ? current
      : await saveOfferConfig({
          ...current,
          keywords,
          country,
          mediaType,
        });
    const proxies = parseOfferProxyList(config.proxies.join("\n"));
    const result = await searchOfferLibrary({
      keywords,
      country,
      mediaType,
      proxies,
      hunt,
    });
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha na busca.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
