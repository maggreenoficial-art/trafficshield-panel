import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { produceNewsDraft } from "@/lib/news/process";
import type { NewsItem } from "@/lib/news/types";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { news?: NewsItem };
    const news = body.news;
    if (!news?.title?.trim() || !news.url?.startsWith("http")) {
      return NextResponse.json({ error: "Escolha uma notícia." }, { status: 400 });
    }
    const draft = await produceNewsDraft({
      id: news.id || news.url,
      title: news.title.trim().slice(0, 220),
      source: (news.source || "Portal").slice(0, 80),
      url: news.url,
      publishedAt: news.publishedAt ?? null,
      summary: (news.summary || "").slice(0, 800),
      imageUrl: news.imageUrl ?? null,
      videoUrl: news.videoUrl ?? null,
      kind: news.kind,
    });
    return NextResponse.json({ draft });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Falha ao escrever o Instagram.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
