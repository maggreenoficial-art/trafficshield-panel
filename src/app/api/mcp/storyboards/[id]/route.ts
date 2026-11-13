import { NextResponse, type NextRequest } from "next/server";
import { requireMcpAuth } from "@/lib/api/mcp-auth";
import { mcpGetStoryboard } from "@/lib/storyboard/mcp-actions";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const auth = await requireMcpAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id } = await context.params;
  try {
    const data = await mcpGetStoryboard(auth.tenantId, id);
    if (!data) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao carregar storyboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
