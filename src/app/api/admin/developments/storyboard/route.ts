import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getProductDevelopment,
  updateProductDevelopment,
} from "@/lib/db/product-developments";
import { createBlock, createStoryboard } from "@/lib/db/storyboards";
import { parseDevScenes } from "@/lib/product-dev/chat";

const SCENE_FORMAT =
  "Retrato vertical 9:16 de anúncio para celular, ponta a ponta, pessoa em primeiro plano ocupando o quadro, sem barras pretas, sem formato quadrado, sem paisagem 16:9, sem layout de página web.";

function withSceneFormat(prompt: string) {
  return `${SCENE_FORMAT} ${prompt}`.replace(/\s+/g, " ").trim();
}

function withSpanishSpeech(prompt: string) {
  if (/español|espanhol/i.test(prompt)) return prompt;
  return `${prompt} La persona habla en español latino, no en portugués.`.replace(
    /\s+/g,
    " "
  );
}

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

    const stamp = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    const board = await createStoryboard(ctx.tenantId, {
      name: `${current.name} · ${stamp}`.slice(0, 120),
      description: current.brief.slice(0, 280) || current.name,
    });
    const storyboardId = board.id;
    const x0 = 80;

    const ebookImage = current.referencePages.find(
      (item) => item.kind === "image" && item.title === "Ebook" && item.url.startsWith("http")
    );
    const blocks: {
      id: string;
      kind: "image" | "video";
      title: string;
      prompt: string;
      modelKey: string;
      referenceUrls?: string[];
    }[] = [];

    let y = 80;
    for (const [index, scene] of scenes.entries()) {
      const isLast = index === scenes.length - 1;
      const scenePrompt = withSceneFormat(scene.prompt);
      const ebookRefs =
        scenes.length > 1 && isLast && ebookImage ? [ebookImage.url] : [];
      const cena = await createBlock(ctx.tenantId, {
        storyboardId,
        modelKey: "image",
        prompt: scenePrompt,
        aspectRatio: "9:16",
        resolution: "1K",
        referenceUrls: ebookRefs,
        positionX: x0,
        positionY: y,
        status: "draft",
      });
      blocks.push({
        id: cena.id,
        kind: "image",
        title: scene.title,
        prompt: scenePrompt,
        modelKey: "image",
        referenceUrls: ebookRefs,
      });

      let x = x0 + 320;
      for (const take of scene.takes) {
        const takePrompt = withSpanishSpeech(take.prompt);
        const video = await createBlock(ctx.tenantId, {
          storyboardId,
          modelKey: "grok_15",
          prompt: takePrompt,
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
          prompt: takePrompt,
          modelKey: "grok_15",
        });
        x += 300;
      }
      y += 280;
    }

    await updateProductDevelopment(ctx.tenantId, current.id, { storyboardId });
    return NextResponse.json({ storyboardId, name: board.name, blocks });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao criar storyboard.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
