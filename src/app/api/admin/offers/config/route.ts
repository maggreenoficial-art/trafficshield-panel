import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getOfferConfig, publicOfferConfig, saveOfferConfig } from "@/lib/db/offer-scrape";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import type { OfferMediaType } from "@/lib/offers/types";

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ config: publicOfferConfig(await getOfferConfig()) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao ler a config.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      apiKey?: string;
      proxies?: string[] | string;
      keywords?: string;
      country?: string;
      mediaType?: OfferMediaType;
    };
    const parsed = parseOfferProxyList(
      Array.isArray(body.proxies) ? body.proxies.join("\n") : String(body.proxies ?? "")
    );
    const proxies = parsed.length
      ? parsed.map((item) => `${item.host}:${item.port}@${item.username}:${item.password}`)
      : undefined;
    const apiKey =
      body.apiKey && !body.apiKey.includes("•") ? body.apiKey : undefined;
    const config = await saveOfferConfig({
      apiKey,
      proxies,
      keywords: body.keywords,
      country: body.country,
      mediaType: body.mediaType,
    });
    return NextResponse.json({ config: publicOfferConfig(config) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao salvar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
