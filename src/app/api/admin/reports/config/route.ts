import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getReportConfig,
  listReportLogs,
  publicReportConfig,
  saveReportConfig,
} from "@/lib/db/reports";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const config = await getReportConfig();
    return NextResponse.json({
      config: publicReportConfig(config),
      logs: await listReportLogs(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao ler as denúncias.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      proxies?: string[] | string;
      reporterName?: string;
      reporterEmail?: string;
    };
    const parsed = parseOfferProxyList(
      Array.isArray(body.proxies) ? body.proxies.join("\n") : String(body.proxies ?? "")
    );
    const config = await saveReportConfig({
      proxies: parsed.length
        ? parsed.map((item) => `${item.host}:${item.port}@${item.username}:${item.password}`)
        : undefined,
      reporterName: body.reporterName,
      reporterEmail: body.reporterEmail,
    });
    return NextResponse.json({ config: publicReportConfig(config) });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao salvar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
