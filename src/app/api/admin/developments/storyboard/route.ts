import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getProductDevelopment,
  updateProductDevelopment,
} from "@/lib/db/product-developments";
import { createBlock, createStoryboard } from "@/lib/db/storyboards";

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Produto obrigatório." }, { status: 400 });
    }
    const current = await getProductDevelopment(ctx.tenantId, body.id);
    if (!current?.plan?.creatives.length) {
      return NextResponse.json(
        { error: "Processe o produto antes de montar o storyboard." },
        { status: 400 }
      );
    }
    if (current.storyboardId) {
      return NextResponse.json({
        storyboardId: current.storyboardId,
        blocks: [],
        already: true,
      });
    }

    const board = await createStoryboard(ctx.tenantId, {
      name: current.name,
      description: current.plan.summary.slice(0, 280),
    });

    const blocks: {
      id: string;
      kind: "image" | "video";
      title: string;
      prompt: string;
      modelKey: string;
    }[] = [];

    let imageAnchor: string | null = null;
    let y = 80;
    for (const creative of current.plan.creatives) {
      if (creative.kind === "image") {
        const block = await createBlock(ctx.tenantId, {
          storyboardId: board.id,
          modelKey: "image",
          prompt: `${creative.title}. ${creative.prompt}`,
          aspectRatio: "1:1",
          resolution: "1K",
          positionX: 80,
          positionY: y,
          status: "draft",
        });
        imageAnchor = block.id;
        blocks.push({
          id: block.id,
          kind: "image",
          title: creative.title,
          prompt: block.prompt,
          modelKey: "image",
        });
        y += 220;
        continue;
      }

      const takes = creative.takes.length
        ? creative.takes
        : [{ title: creative.title, prompt: creative.prompt, seconds: 8 }];
      let x = 360;
      for (const take of takes) {
        const block = await createBlock(ctx.tenantId, {
          storyboardId: board.id,
          modelKey: "grok_15",
          prompt: `${creative.title} · ${take.title}. ${take.prompt}`,
          aspectRatio: "9:16",
          resolution: "720p",
          positionX: x,
          positionY: y,
          status: "draft",
          sourceBlockId: imageAnchor,
        });
        blocks.push({
          id: block.id,
          kind: "video",
          title: take.title,
          prompt: block.prompt,
          modelKey: "grok_15",
        });
        x += 280;
      }
      y += 220;
    }

    await updateProductDevelopment(ctx.tenantId, current.id, {
      storyboardId: board.id,
    });

    return NextResponse.json({ storyboardId: board.id, blocks, already: false });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao criar storyboard.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
