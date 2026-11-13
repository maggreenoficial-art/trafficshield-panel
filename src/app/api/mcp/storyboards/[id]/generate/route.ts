import { NextResponse, type NextRequest } from "next/server";
import { requireMcpAuth } from "@/lib/api/mcp-auth";
import { mcpStartGeneration } from "@/lib/storyboard/mcp-actions";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMcpAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: storyboardId } = await context.params;

  try {
    const body = (await request.json()) as {
      blockId?: string;
      prompt?: string;
      referenceUrls?: string[];
      duration?: number;
    };
    if (!body.blockId) {
      return NextResponse.json({ error: "blockId obrigatório." }, { status: 400 });
    }

    const block = await mcpStartGeneration(auth.tenantId, {
      storyboardId,
      blockId: body.blockId,
      prompt: body.prompt,
      referenceUrls: body.referenceUrls,
      duration: body.duration,
    });
    return NextResponse.json({ block });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao gerar.";
    const status = /créditos/i.test(message)
      ? 402
      : /não encontrado|precisa da imagem/i.test(message)
        ? 400
        : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
