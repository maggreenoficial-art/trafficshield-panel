import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { fetchCassilandiaNews } from "@/lib/news/fetch-cassilandia";

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const items = await fetchCassilandiaNews();
    return NextResponse.json({ items });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Falha ao buscar as notícias.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
