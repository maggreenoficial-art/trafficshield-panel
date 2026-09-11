import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { stripImageMetadata } from "@/lib/media/strip-image-metadata";

export const runtime = "nodejs";

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_IMAGE = 30 * 1024 * 1024;

/** Remove EXIF/metadados de uma imagem e devolve o arquivo limpo. */
export async function POST(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
    }

    if (!IMAGE_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Use imagem JPEG, PNG ou WEBP." },
        { status: 400 }
      );
    }

    if (file.size > MAX_IMAGE) {
      return NextResponse.json(
        { error: "Arquivo maior que 30MB." },
        { status: 400 }
      );
    }

    const input = Buffer.from(await file.arrayBuffer());
    const cleaned = await stripImageMetadata(input);

    const baseName = (file.name || "criativo")
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80);
    const filename = `${baseName || "criativo"}-limpo.${cleaned.extension}`;

    return new NextResponse(new Uint8Array(cleaned.buffer), {
      status: 200,
      headers: {
        "Content-Type": cleaned.contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Norat-Metadata-Stripped": "1",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Falha ao limpar imagem.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
