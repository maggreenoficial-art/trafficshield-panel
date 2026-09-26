import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { listBrainDocs, saveBrainDocs } from "@/lib/db/dev-brain";
import type { DevDoc } from "@/lib/product-dev/types";

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const docs = await listBrainDocs();
    return NextResponse.json({ docs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao ler o cérebro.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as { docs?: DevDoc[] };
    if (!Array.isArray(body.docs)) {
      return NextResponse.json({ error: "Documentos inválidos." }, { status: 400 });
    }
    const docs = await saveBrainDocs(body.docs);
    return NextResponse.json({ docs });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao salvar o cérebro.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
