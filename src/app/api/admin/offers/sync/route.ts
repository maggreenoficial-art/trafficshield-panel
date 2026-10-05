import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getOfferConfig, publicOfferConfig, saveOfferConfig } from "@/lib/db/offer-scrape";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { downloadProxySellerList } from "@/lib/offers/proxy-seller";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const current = await getOfferConfig();
    const raw = await downloadProxySellerList(current.apiKey);
    const proxies = parseOfferProxyList(raw).map(
      (item) => `${item.host}:${item.port}@${item.username}:${item.password}`
    );
    if (!proxies.length) {
      throw new Error("A API da Proxy-Seller não trouxe nenhum IP residente.");
    }
    const config = await saveOfferConfig({ ...current, proxies });
    return NextResponse.json({ config: publicOfferConfig(config) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao sincronizar.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
