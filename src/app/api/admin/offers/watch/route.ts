import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  listWatchedOfferPages,
  removeWatchedOfferPage,
  upsertWatchedOfferPage,
} from "@/lib/db/offer-watch";

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ pages: await listWatchedOfferPages() });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao ler o acompanhamento.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      pageId?: string | null;
      pageName?: string;
      keywords?: string;
      country?: string;
      adCount?: number;
      linkUrl?: string | null;
      snapshotUrl?: string | null;
      reason?: string;
    };
    const pages = await upsertWatchedOfferPage({
      pageId: body.pageId ?? null,
      pageName: body.pageName ?? "",
      keywords: body.keywords ?? "",
      country: body.country ?? "BR",
      adCount: body.adCount ?? 0,
      linkUrl: body.linkUrl ?? null,
      snapshotUrl: body.snapshotUrl ?? null,
      reason: body.reason || "Marcada para acompanhamento.",
    });
    return NextResponse.json({ pages });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao acompanhar.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const url = new URL(request.url);
    const pages = await removeWatchedOfferPage({
      pageId: url.searchParams.get("pageId"),
      pageName: url.searchParams.get("pageName") ?? "",
    });
    return NextResponse.json({ pages });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao tirar do acompanhamento.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
