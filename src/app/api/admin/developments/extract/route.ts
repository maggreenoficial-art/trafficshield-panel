import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { extractText } from "unpdf";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um PDF." }, { status: 400 });
    }
    if (file.size > 12_000_000) {
      return NextResponse.json({ error: "PDF passa de 12 MB." }, { status: 400 });
    }
    const name = file.name || "documento.pdf";
    const isPdf =
      file.type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "O arquivo não é PDF." }, { status: 400 });
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const { text } = await extractText(data, { mergePages: true });
    const extracted = (Array.isArray(text) ? text.join("\n\n") : text)
      .replace(/\u0000/g, "")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim()
      .slice(0, 40_000);

    if (extracted.length < 40) {
      return NextResponse.json(
        {
          error:
            "Esse PDF não tem texto selecionável. Se for só imagem, exporte como .txt.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ name, text: extracted });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao ler o PDF.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
