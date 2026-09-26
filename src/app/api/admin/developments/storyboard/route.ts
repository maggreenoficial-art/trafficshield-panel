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

    const hostedImages = current.referencePages
      .filter((item) => item.kind === "image" && item.url.startsWith("http"))
      .slice(0, 7);
    const blocks: {
      id: string;
      kind: "image" | "video";
      title: string;
      prompt: string;
      modelKey: string;
      referenceUrls?: string[];
      resultUrl?: string;
    }[] = [];

    const hostedUrls = hostedImages.map((item) => item.url);
    const photoBlocks: { id: string; y: number }[] = [];

    if (hostedImages.length) {
      for (const [index, photo] of hostedImages.entries()) {
        const y = 80 + index * 280;
        const ready = await createBlock(ctx.tenantId, {
          storyboardId,
          modelKey: "image",
          prompt: photo.title || "Referência hospedada",
          aspectRatio: "9:16",
          resolution: "1K",
          referenceUrls: [photo.url],
          positionX: x0,
          positionY: y,
          status: "success",
          resultUrl: photo.url,
          resultUrls: [photo.url],
        });
        photoBlocks.push({ id: ready.id, y });
        blocks.push({
          id: ready.id,
          kind: "image",
          title: photo.title,
          prompt: photo.title,
          modelKey: "image",
          referenceUrls: [photo.url],
          resultUrl: photo.url,
        });
      }
    }

    let takeIndex = 0;
    let y = 80;
    for (const scene of scenes) {
      const scenePrompt = withSceneFormat(scene.prompt);
      let cenaId = photoBlocks[0]?.id;
      if (!cenaId) {
        const cena = await createBlock(ctx.tenantId, {
          storyboardId,
          modelKey: "image",
          prompt: scenePrompt,
          aspectRatio: "9:16",
          resolution: "1K",
          positionX: x0,
          positionY: y,
          status: "draft",
        });
        cenaId = cena.id;
        blocks.push({
          id: cena.id,
          kind: "image",
          title: scene.title,
          prompt: scenePrompt,
          modelKey: "image",
        });
      }

      let x = x0 + 320;
      for (const take of scene.takes) {
        const takePrompt = withSpanishSpeech(take.prompt);
        const photo = photoBlocks.length
          ? photoBlocks[takeIndex % photoBlocks.length]
          : null;
        const video = await createBlock(ctx.tenantId, {
          storyboardId,
          modelKey: "grok_15",
          prompt: takePrompt,
          aspectRatio: "9:16",
          resolution: "720p",
          referenceUrls: hostedUrls,
          positionX: x,
          positionY: photo?.y ?? y,
          status: "draft",
          sourceBlockId: photo?.id ?? cenaId,
        });
        blocks.push({
          id: video.id,
          kind: "video",
          title: take.title,
          prompt: takePrompt,
          modelKey: "grok_15",
          referenceUrls: hostedUrls,
        });
        x += 300;
        takeIndex += 1;
      }
      if (!photoBlocks.length) y += 280;
    }

    await updateProductDevelopment(ctx.tenantId, current.id, { storyboardId });
    return NextResponse.json({ storyboardId, name: board.name, blocks });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao criar storyboard.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
