import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { getTenantCredits } from "@/lib/db/credits";
import {
  createStoryboard,
  listStoryboards,
} from "@/lib/db/storyboards";

export async function GET(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const [storyboards, credits] = await Promise.all([
      listStoryboards(ctx.tenantId),
      getTenantCredits(ctx.tenantId),
    ]);
    return NextResponse.json({ storyboards, credits });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar storyboards." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
    }
    const storyboard = await createStoryboard(ctx.tenantId, {
      name: body.name,
      description: body.description,
    });
    return NextResponse.json({ storyboard });
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar storyboard." },
      { status: 500 }
    );
  }
}
