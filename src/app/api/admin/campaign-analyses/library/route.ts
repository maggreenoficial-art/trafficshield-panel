import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getCampaignAnalysis,
  patchCampaignAnalysisResult,
} from "@/lib/db/campaign-analyses";
import { getOfferConfig } from "@/lib/db/offer-scrape";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { searchOfferLibrary } from "@/lib/offers/search";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      keywords?: string;
      country?: string;
      analysisId?: string;
      hunt?: boolean;
    };
    const config = await getOfferConfig();
    const hunt = Boolean(body.hunt) || !(body.keywords ?? "").trim();
    const keywords = (body.keywords ?? "").trim();
    const country = (body.country ?? config.country ?? "BR").trim() || "BR";
    const proxies = parseOfferProxyList(config.proxies.join("\n"));
    const result = await searchOfferLibrary({
      keywords,
      country,
      mediaType: "all",
      proxies,
      hunt,
    });
    if (body.analysisId) {
      const saved = await getCampaignAnalysis(ctx.tenantId, body.analysisId);
      if (saved) {
        await patchCampaignAnalysisResult(ctx.tenantId, saved.id, {
          ...saved.result,
          library: result.report,
        });
      }
    }
    return NextResponse.json({
      library: result.report,
      plan: result.plan,
      watched: result.watched,
      autoWatched: result.autoWatched,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha na Biblioteca da Meta.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
