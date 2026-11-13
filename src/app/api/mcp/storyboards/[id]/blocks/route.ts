import { NextResponse, type NextRequest } from "next/server";
import { requireMcpAuth } from "@/lib/api/mcp-auth";
import {
  mcpCreateImage,
  mcpCreateVideoTake,
} from "@/lib/storyboard/mcp-actions";
import { getStoryboardModel } from "@/lib/kie/models";

type Ctx = { params: Promise<{ id: string }> };

/** Cria bloco de imagem ou vídeo no storyboard. */
export async function POST(request: NextRequest, context: Ctx) {
  const auth = await requireMcpAuth(request);
  if (auth instanceof NextResponse) return auth;
  const { id: storyboardId } = await context.params;

  try {
    const body = (await request.json()) as {
      kind?: "image" | "video";
      modelKey?: string;
      prompt?: string;
      resolution?: string;
      aspectRatio?: string;
      referenceUrls?: string[];
      sourceBlockId?: string | null;
      duration?: number;
      startGeneration?: boolean;
    };

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: "prompt obrigatório." }, { status: 400 });
    }

    const modelKey = body.modelKey || (body.kind === "video" ? "grok_15" : "image");
    const model = getStoryboardModel(modelKey);
    if (!model) {
      return NextResponse.json({ error: "Modelo inválido." }, { status: 400 });
    }

    if (model.kind === "image") {
      const block = await mcpCreateImage(auth.tenantId, {
        storyboardId,
        prompt: body.prompt,
        resolution: body.resolution,
        aspectRatio: body.aspectRatio,
        modelKey,
        referenceUrls: body.referenceUrls,
        startGeneration: body.startGeneration,
      });
      return NextResponse.json({ block });
    }

    const block = await mcpCreateVideoTake(auth.tenantId, {
      storyboardId,
      prompt: body.prompt,
      modelKey,
      resolution: body.resolution,
      aspectRatio: body.aspectRatio,
      referenceUrls: body.referenceUrls,
      sourceBlockId: body.sourceBlockId,
      duration: body.duration,
      startGeneration: body.startGeneration,
    });
    return NextResponse.json({ block });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro ao criar bloco.";
    const status = /não encontrado|inválid/i.test(message) ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
