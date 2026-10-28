import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { readPoliticaDocument } from "@/lib/politica/document";
import { POLITICA_MAX_FILES } from "@/lib/politica/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const form = await request.formData();
    const files = form
      .getAll("file")
      .filter((item): item is File => item instanceof File && item.size > 0);
    if (!files.length) {
      return NextResponse.json({ error: "Envie ao menos um documento." }, { status: 400 });
    }
    if (files.length > POLITICA_MAX_FILES) {
      return NextResponse.json(
        { error: `No máximo ${POLITICA_MAX_FILES} arquivos por vez.` },
        { status: 400 }
      );
    }
    const documents = [];
    for (const file of files) {
      documents.push(await readPoliticaDocument(file));
    }
    return NextResponse.json({ documents });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao ler o documento.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
