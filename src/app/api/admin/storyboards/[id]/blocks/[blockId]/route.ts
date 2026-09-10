import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { deleteBlock, getBlockById, updateBlock } from "@/lib/db/storyboards";
import { syncBlockById } from "@/lib/kie/sync-block";

type Ctx = { params: Promise<{ id: string; blockId: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const panel = await requirePlatformAdmin(request);
  if (panel instanceof NextResponse) return panel;
  const { blockId } = await context.params;

  try {
    const existing = await getBlockById(panel.tenantId, blockId);
    if (!existing) {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    if (
      existing.kieTaskId &&
      (existing.status === "queued" || existing.status === "generating")
    ) {
      const block = await syncBlockById(panel.tenantId, blockId);
      return NextResponse.json({ block });
    }
    return NextResponse.json({ block: existing });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao sincronizar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const panel = await requirePlatformAdmin(request);
  if (panel instanceof NextResponse) return panel;
  const { blockId } = await context.params;

  try {
    const existing = await getBlockById(panel.tenantId, blockId);
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const body = (await request.json()) as {
      positionX?: number;
      positionY?: number;
      prompt?: string;
      modelKey?: string;
      aspectRatio?: string;
      resolution?: string;
      referenceUrls?: string[];
      sourceBlockId?: string | null;
    };

    const block = await updateBlock(panel.tenantId, blockId, {
      positionX: body.positionX,
      positionY: body.positionY,
      prompt: body.prompt,
      modelKey: body.modelKey,
      aspectRatio: body.aspectRatio,
      resolution: body.resolution,
      referenceUrls: body.referenceUrls,
      sourceBlockId: body.sourceBlockId,
    });
    return NextResponse.json({ block });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar bloco." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const panel = await requirePlatformAdmin(request);
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
