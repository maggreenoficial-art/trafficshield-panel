import { NextResponse, type NextRequest } from "next/server";
import { requireMcpAuth } from "@/lib/api/mcp-auth";
import { mcpCreateTakePipeline } from "@/lib/storyboard/mcp-actions";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Claude entrega os 3 prompts; o painel cria imagem (1K/2K/4K) + 2 takes
 * e opcionalmente inicia a geração da imagem.
 */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMcpAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: storyboardId } = await context.params;

  try {
    const body = (await request.json()) as {
      imagePrompt?: string;
      take1Prompt?: string;
      take2Prompt?: string;
      baseImageUrl?: string | null;
      aspectRatio?: string;
      imageResolution?: string;
      videoResolution?: string;
      videoModelKey?: string;
      startImage?: boolean;
    };

    if (
      !body.imagePrompt?.trim() ||
      !body.take1Prompt?.trim() ||
      !body.take2Prompt?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "Informe imagePrompt, take1Prompt e take2Prompt (Claude escreve os takes).",
        },
        { status: 400 }
      );
    }

    const pipeline = await mcpCreateTakePipeline(auth.tenantId, {
      storyboardId,
      imagePrompt: body.imagePrompt,
      take1Prompt: body.take1Prompt,
      take2Prompt: body.take2Prompt,
      baseImageUrl: body.baseImageUrl,
      aspectRatio: body.aspectRatio,
      imageResolution: body.imageResolution,
      videoResolution: body.videoResolution,
      videoModelKey: body.videoModelKey,
      startImage: body.startImage,
    });

    return NextResponse.json(pipeline);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao montar os takes.";
    const status = /não encontrado/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
