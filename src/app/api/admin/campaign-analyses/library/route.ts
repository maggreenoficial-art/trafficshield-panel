import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getCampaignAnalysis,
  patchCampaignAnalysisResult,
} from "@/lib/db/campaign-analyses";
import { getOfferConfig } from "@/lib/db/offer-scrape";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { scrapeMetaAds } from "@/lib/offers/scrape";
import { summarizeOfferScale } from "@/lib/offers/scale";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      keywords?: string;
      country?: string;
      analysisId?: string;
    };
    const config = await getOfferConfig();
    const keywords = (body.keywords ?? "").trim();
    const country = (body.country ?? config.country ?? "BR").trim() || "BR";
    const proxies = parseOfferProxyList(config.proxies.join("\n"));
    const result = await scrapeMetaAds({
      keywords,
      country,
      mediaType: "all",
      proxies,
    });
    const library = summarizeOfferScale({
      keywords,
      country,
      ads: result.ads,
      libraryTotal: result.total,
      proxy: result.proxy,
    });
    if (body.analysisId) {
      const saved = await getCampaignAnalysis(ctx.tenantId, body.analysisId);
      if (saved) {
        await patchCampaignAnalysisResult(ctx.tenantId, saved.id, {
          ...saved.result,
          library,
        });
      }
    }
    return NextResponse.json({ library });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha na Biblioteca da Meta.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
