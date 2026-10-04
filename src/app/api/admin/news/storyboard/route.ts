import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getNewsBrand } from "@/lib/db/news-brand";
import { createBlock, createStoryboard } from "@/lib/db/storyboards";
import { composeStoryboardPrompt } from "@/lib/news/process";
import type { NewsDraft } from "@/lib/news/types";

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { draft?: NewsDraft };
    const draft = body.draft;
    if (!draft?.headline?.trim() || !draft.caption?.trim()) {
      return NextResponse.json(
        { error: "Produza a notícia antes de autorizar." },
        { status: 400 }
      );
    }

    const brand = await getNewsBrand();
    if (!brand.logoUrl || !brand.mockupUrl) {
      return NextResponse.json(
        { error: "Envie a logo e o mockup da página antes de autorizar." },
        { status: 400 }
      );
    }

    const stamp = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    const board = await createStoryboard(ctx.tenantId, {
      name: `Notícia · ${draft.headline} · ${stamp}`.slice(0, 120),
      description: draft.caption.slice(0, 280),
    });

    const referenceUrls = [
      brand.mockupUrl,
      brand.logoUrl,
      draft.news?.imageUrl ?? "",
    ].filter((url) => url.startsWith("http"));

    const block = await createBlock(ctx.tenantId, {
      storyboardId: board.id,
      modelKey: "image",
      prompt: composeStoryboardPrompt({
        ...draft,
        headline: draft.headline.trim(),
        caption: draft.caption.trim(),
      }),
      aspectRatio: "9:16",
      resolution: "1K",
      referenceUrls,
      positionX: 120,
      positionY: 100,
      status: "draft",
    });

    return NextResponse.json({
      storyboardId: board.id,
      name: board.name,
      block: {
        id: block.id,
        prompt: block.prompt,
        referenceUrls: block.referenceUrls,
      },
    });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Falha ao criar o storyboard.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
