import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getOfferConfig, publicOfferConfig, saveOfferConfig } from "@/lib/db/offer-scrape";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { readProxyUpload } from "@/lib/offers/zip-text";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um .txt, .csv ou .zip." }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Arquivo maior que 2MB." }, { status: 413 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const text = readProxyUpload(file.name, bytes);
    const parsed = parseOfferProxyList(text);
    if (!parsed.length) {
      throw new Error("Não achei nenhum proxy no arquivo.");
    }
    const current = await getOfferConfig();
    const config = await saveOfferConfig({
      ...current,
      proxies: parsed.map(
        (item) => `${item.host}:${item.port}@${item.username}:${item.password}`
      ),
    });
    return NextResponse.json({ config: publicOfferConfig(config) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha no upload.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
