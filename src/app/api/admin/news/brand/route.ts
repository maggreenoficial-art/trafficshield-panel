import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getNewsBrand, saveNewsBrand } from "@/lib/db/news-brand";

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    return NextResponse.json({ brand: await getNewsBrand() });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Falha ao ler logo e mockup.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      logoUrl?: string | null;
      mockupUrl?: string | null;
    };
    const brand = await saveNewsBrand({
      logoUrl: body.logoUrl ?? null,
      mockupUrl: body.mockupUrl ?? null,
    });
    return NextResponse.json({ brand });
  } catch (error) {
    const msg =
      error instanceof Error ? error.message : "Falha ao salvar logo e mockup.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
