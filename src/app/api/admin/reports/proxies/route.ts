import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { publicReportConfig, saveReportConfig } from "@/lib/db/reports";
import { getOfferConfig } from "@/lib/db/offer-scrape";
import { downloadProxySellerList } from "@/lib/offers/proxy-seller";
import { reportProxyLines } from "@/lib/reports/proxies";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const offers = await getOfferConfig();
    const raw = await downloadProxySellerList(offers.apiKey);
    const proxies = reportProxyLines(raw);
    if (!proxies.length) {
      throw new Error("A API da Proxy-Seller não trouxe nenhum IP residente.");
    }
    const config = await saveReportConfig({ proxies });
    return NextResponse.json({
      config: publicReportConfig(config),
      released: proxies.length,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao liberar os proxies.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
