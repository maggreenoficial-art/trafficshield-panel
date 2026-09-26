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
    const flatTakes = scenes.flatMap((scene) => scene.takes);
    const actressPrompt = withSceneFormat(
      `${scenes[0]?.prompt ?? ""} A atriz deste vídeo, uma só pessoa, rosto nítido, mesma roupa e mesmo cabelo em todos os takes. Sem ebook, sem livro, sem prato e sem embalagem nesta foto. Os takes seguintes só mudam o ângulo e a ação.`
    );
    const atriz = await createBlock(ctx.tenantId, {
      storyboardId,
      modelKey: "image",
      prompt: actressPrompt,
      aspectRatio: "9:16",
      resolution: "1K",
      positionX: x0,
      positionY: 80,
      status: "draft",
    });
    blocks.push({
      id: atriz.id,
      kind: "image",
      title: "Atriz",
      prompt: actressPrompt,
      modelKey: "image",
    });

    let x = x0 + 340;
    for (const [index, take] of flatTakes.entries()) {
      const isLast = index === flatTakes.length - 1;
      const showProduct = Boolean(take.showProduct) || index === 0 || isLast;
      const refs = showProduct ? hostedUrls : [];
      const takePrompt = [
        "Mesma atriz da imagem ligada. Mantenha o rosto, o cabelo e a roupa. Mude só o ângulo e a ação.",
        showProduct
          ? "Nesta tomada o produto das imagens de referência entra no quadro."
          : "Não mostre ebook, livro, prato nem embalagem.",
        withSpanishSpeech(take.prompt),
      ].join(" ");
      const video = await createBlock(ctx.tenantId, {
        storyboardId,
        modelKey: "grok_15",
        prompt: takePrompt,
        aspectRatio: "9:16",
        resolution: "720p",
        referenceUrls: refs,
        positionX: x,
        positionY: 80,
        status: "draft",
        sourceBlockId: atriz.id,
      });
      blocks.push({
        id: video.id,
        kind: "video",
        title: take.title,
        prompt: takePrompt,
        modelKey: "grok_15",
        referenceUrls: refs,
      });
      x += 300;
    }

    await updateProductDevelopment(ctx.tenantId, current.id, { storyboardId });
    return NextResponse.json({ storyboardId, name: board.name, blocks });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao criar storyboard.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
