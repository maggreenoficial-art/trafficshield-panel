import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { readPoliticaDocument } from "@/lib/politica/document";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Envie um documento." }, { status: 400 });
    }
    const document = await readPoliticaDocument(file);
    return NextResponse.json(document);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao ler o documento.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
