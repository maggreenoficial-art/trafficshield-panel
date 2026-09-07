import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { deleteBlock, getBlockById } from "@/lib/db/storyboards";
import { syncBlockById } from "@/lib/kie/sync-block";

type Ctx = { params: Promise<{ id: string; blockId: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const panel = await requirePanelContext(request);
  if (panel instanceof NextResponse) return panel;
  const { blockId } = await context.params;

  try {
    const block = await syncBlockById(panel.tenantId, blockId);
    if (!block) {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ block });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao sincronizar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const panel = await requirePanelContext(request);
  if (panel instanceof NextResponse) return panel;
  const { blockId } = await context.params;

  try {
    const existing = await getBlockById(panel.tenantId, blockId);
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    await deleteBlock(panel.tenantId, blockId);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir bloco." }, { status: 500 });
  }
}
