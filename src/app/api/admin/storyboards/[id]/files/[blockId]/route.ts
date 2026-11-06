import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getBlockById } from "@/lib/db/storyboards";
import { getStoryboardModel } from "@/lib/kie/models";
import { imageDownloadName } from "@/lib/storyboard/bulk-prompts";

type Ctx = { params: Promise<{ id: string; blockId: string }> };

function extensionFrom(url: string, contentType: string | null) {
  if (contentType?.includes("jpeg")) return "jpg";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("png")) return "png";
  const match = url.split("?")[0]?.match(/\.([a-z0-9]+)$/i);
  const ext = match?.[1]?.toLowerCase();
  if (ext === "jpeg") return "jpg";
  if (ext === "jpg" || ext === "png" || ext === "webp") return ext;
  return "png";
}

/** Entrega a imagem pronta de um bloco para o download em massa. */
export async function GET(request: NextRequest, context: Ctx) {
  const panel = await requirePlatformAdmin(request);
  if (panel instanceof NextResponse) return panel;
  const { id: storyboardId, blockId } = await context.params;

  const block = await getBlockById(panel.tenantId, blockId);
  if (!block || block.storyboardId !== storyboardId || !block.resultUrl) {
    return NextResponse.json({ error: "Imagem não encontrada." }, { status: 404 });
  }

  const model = getStoryboardModel(block.modelKey);
  if (model?.kind !== "image") {
    return NextResponse.json(
      { error: "Este bloco não é uma imagem." },
      { status: 400 }
    );
  }

  let target: URL;
  try {
    target = new URL(block.resultUrl);
  } catch {
    return NextResponse.json({ error: "URL da imagem inválida." }, { status: 400 });
  }
  if (target.protocol !== "https:") {
    return NextResponse.json({ error: "URL da imagem inválida." }, { status: 400 });
  }

  const upstream = await fetch(target, { redirect: "follow" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: "Não foi possível baixar a imagem." },
      { status: 502 }
    );
  }

  const type = upstream.headers.get("content-type");
  const ext = extensionFrom(block.resultUrl, type);
  const filename = imageDownloadName(0, block.prompt || "imagem", ext);

  return new Response(upstream.body, {
    headers: {
      "Content-Type": type || "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
