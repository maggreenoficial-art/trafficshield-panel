import { NextResponse, type NextRequest } from "next/server";
import { requireMcpAuth } from "@/lib/api/mcp-auth";
import { getBlockById } from "@/lib/db/storyboards";
import { mcpSyncBlock } from "@/lib/storyboard/mcp-actions";

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
