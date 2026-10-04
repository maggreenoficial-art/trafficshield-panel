import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { enrichInstagramItem } from "@/lib/news/instagram";
import { newsItemFromInstagram } from "@/lib/news/social";
import { resolveYoutubeNews } from "@/lib/news/youtube";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { url?: string };
    const raw = body.url?.trim() ?? "";
    if (!raw.startsWith("http")) {
      return NextResponse.json(
        { error: "Cole um link do Instagram ou do YouTube." },
        { status: 400 }
      );
    }

    const publishedAt = new Date().toISOString();
    const youtube = await resolveYoutubeNews(raw);
    if (youtube) {
      return NextResponse.json({
        item: { ...youtube, publishedAt: youtube.publishedAt || publishedAt },
      });
    }

    const instagram = newsItemFromInstagram({
      url: raw,
      title: "Post no Instagram",
      summary: "Post colado do Instagram.",
      publishedAt,
    });
    if (instagram) {
      return NextResponse.json({ item: await enrichInstagramItem(instagram) });
    }

    return NextResponse.json(
      { error: "Esse link não é um Reel/post do Instagram nem um vídeo do YouTube." },
      { status: 400 }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Não leu esse link.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
