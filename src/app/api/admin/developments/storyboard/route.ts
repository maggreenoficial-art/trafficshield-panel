import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getProductDevelopment,
  updateProductDevelopment,
} from "@/lib/db/product-developments";
import {
  createBlock,
  createStoryboard,
  listBlocks,
} from "@/lib/db/storyboards";
import { parseDevScenes } from "@/lib/product-dev/chat";

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { id?: string; storyboard?: unknown };
    const scenes = parseDevScenes(body.storyboard);
    if (!body.id || !scenes.length) {
      return NextResponse.json(
        { error: "Não há cenas para enviar ao storyboard." },
        { status: 400 }
      );
    }
    const current = await getProductDevelopment(ctx.tenantId, body.id);
    if (!current) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    let storyboardId = current.storyboardId;
    if (!storyboardId) {
      const board = await createStoryboard(ctx.tenantId, {
        name: current.name,
        description: current.brief.slice(0, 280) || current.name,
      });
      storyboardId = board.id;
    }

    const existing = await listBlocks(ctx.tenantId, storyboardId);
    let x0 = 80;
    if (existing.length) {
      x0 = Math.max(...existing.map((block) => block.positionX)) + 340;
    }

    const blocks: {
      id: string;
      kind: "image" | "video";
      title: string;
      prompt: string;
      modelKey: string;
    }[] = [];

    let y = 80;
    for (const scene of scenes) {
      const cena = await createBlock(ctx.tenantId, {
        storyboardId,
        modelKey: "image",
        prompt: scene.prompt,
        aspectRatio: "9:16",
        resolution: "1K",
        positionX: x0,
        positionY: y,
        status: "draft",
      });
      blocks.push({
        id: cena.id,
        kind: "image",
        title: scene.title,
        prompt: scene.prompt,
        modelKey: "image",
      });

      let x = x0 + 320;
      for (const take of scene.takes) {
        const video = await createBlock(ctx.tenantId, {
          storyboardId,
          modelKey: "grok_15",
          prompt: take.prompt,
          aspectRatio: "9:16",
          resolution: "720p",
          positionX: x,
          positionY: y,
          status: "draft",
          sourceBlockId: cena.id,
        });
        blocks.push({
          id: video.id,
          kind: "video",
          title: take.title,
          prompt: take.prompt,
          modelKey: "grok_15",
        });
        x += 300;
      }
      y += 280;
    }

    await updateProductDevelopment(ctx.tenantId, current.id, { storyboardId });
    return NextResponse.json({ storyboardId, blocks });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao criar storyboard.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
