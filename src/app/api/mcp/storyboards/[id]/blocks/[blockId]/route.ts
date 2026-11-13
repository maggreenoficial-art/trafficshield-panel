import { NextResponse, type NextRequest } from "next/server";
import { requireMcpAuth } from "@/lib/api/mcp-auth";
import { getBlockById } from "@/lib/db/storyboards";
import {
  mcpDeleteBlock,
  mcpSyncBlock,
  mcpUpdateBlock,
} from "@/lib/storyboard/mcp-actions";

type Ctx = { params: Promise<{ id: string; blockId: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireMcpAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: storyboardId, blockId } = await context.params;

  try {
    const existing = await getBlockById(auth.tenantId, blockId);
    if (!existing || existing.storyboardId !== storyboardId) {
      return NextResponse.json({ error: "Bloco não encontrado." }, { status: 404 });
    }
    if (
      existing.kieTaskId &&
      (existing.status === "queued" || existing.status === "generating")
    ) {
      const block = await mcpSyncBlock(auth.tenantId, blockId);
      return NextResponse.json({ block: block ?? existing });
    }
    return NextResponse.json({ block: existing });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao sincronizar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: Ctx) {
  const auth = await requireMcpAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: storyboardId, blockId } = await context.params;

  try {
    const body = (await request.json()) as {
      prompt?: string;
      resolution?: string;
      aspectRatio?: string;
      modelKey?: string;
      referenceUrls?: string[];
      sourceBlockId?: string | null;
    };
    const block = await mcpUpdateBlock(auth.tenantId, {
      storyboardId,
      blockId,
      ...body,
    });
    return NextResponse.json({ block });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao atualizar.";
    const status = /não encontrado|inválid/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const auth = await requireMcpAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: storyboardId, blockId } = await context.params;

  try {
    const result = await mcpDeleteBlock(auth.tenantId, {
      storyboardId,
      blockId,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao apagar.";
    const status = /não encontrado/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
