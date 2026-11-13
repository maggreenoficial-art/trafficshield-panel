import { NextResponse, type NextRequest } from "next/server";
import { requireMcpAuth } from "@/lib/api/mcp-auth";
import {
  mcpCreateStoryboard,
  mcpListStoryboards,
} from "@/lib/storyboard/mcp-actions";

export async function GET(request: NextRequest) {
  const ctx = await requireMcpAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const data = await mcpListStoryboards(ctx.tenantId);
    return NextResponse.json(data);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao listar storyboards.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireMcpAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json()) as {
      name?: string;
      description?: string;
    };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
    }
    const storyboard = await mcpCreateStoryboard(ctx.tenantId, {
      name: body.name,
      description: body.description,
    });
    return NextResponse.json({ storyboard });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar storyboard.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
