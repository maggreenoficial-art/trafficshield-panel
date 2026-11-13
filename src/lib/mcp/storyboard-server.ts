import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  mcpCreateImage,
  mcpCreateStoryboard,
  mcpCreateTakePipeline,
  mcpCreateVideoTake,
  mcpDeleteBlock,
  mcpGetStoryboard,
  mcpListCapabilities,
  mcpListStoryboards,
  mcpStartGeneration,
  mcpSyncBlock,
  mcpUpdateBlock,
} from "@/lib/storyboard/mcp-actions";
import { getBlockById } from "@/lib/db/storyboards";

const PRINCIPAL_TENANT = "00000000-0000-0000-0000-000000000001";

function jsonText(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function errText(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Erro interno no MCP.";
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

/** Servidor MCP remoto — todas as funções do storyboard norat. */
export function createStoryboardMcpServer() {
  const tenantId = PRINCIPAL_TENANT;
  const server = new McpServer({
    name: "norat-storyboard",
    version: "1.1.0",
  });

  server.registerTool(
    "list_capabilities",
    {
      description:
        "Lista modelos, resoluções (imagem 1K/2K/4K; vídeo 480p/720p/1080p) e durações disponíveis. Use antes de criar blocos.",
      inputSchema: {},
    },
    async () => jsonText(mcpListCapabilities())
  );

  server.registerTool(
    "list_storyboards",
    {
      description:
        "Lista storyboards da conta principal norat, créditos Kie e capabilities.",
      inputSchema: {},
    },
    async () => {
      try {
        return jsonText(await mcpListStoryboards(tenantId));
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "get_storyboard",
    {
      description:
        "Detalhe de um storyboard: blocos (imagem + takes), status e créditos.",
      inputSchema: {
        storyboard_id: z.string().describe("UUID do storyboard"),
      },
    },
    async ({ storyboard_id }) => {
      try {
        const data = await mcpGetStoryboard(tenantId, storyboard_id);
        if (!data) return errText(new Error("Storyboard não encontrado."));
        return jsonText(data);
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "create_storyboard",
    {
      description: "Cria um storyboard novo (ex.: campanha / criativo).",
      inputSchema: {
        name: z.string().min(1).describe("Nome curto do board"),
        description: z.string().optional().describe("Descrição opcional"),
      },
    },
    async ({ name, description }) => {
      try {
        const storyboard = await mcpCreateStoryboard(tenantId, {
          name,
          description,
        });
        return jsonText({ storyboard });
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "create_image",
    {
      description: `Cria e (por padrão) gera uma imagem no storyboard.
Resolução: 1K (padrão, mais barato), 2K ou 4K. Modelos: image, image_hq, logo.
NÃO force 4K — use 1K salvo se o usuário pedir alta resolução.`,
      inputSchema: {
        storyboard_id: z.string(),
        prompt: z.string().min(1),
        resolution: z
          .enum(["1K", "2K", "4K"])
          .optional()
          .describe("Padrão 1K"),
        aspect_ratio: z.string().optional().describe("Padrão 9:16"),
        model_key: z
          .enum(["image", "image_hq", "logo"])
          .optional()
          .describe("Padrão image"),
        reference_urls: z
          .array(z.string().url())
          .optional()
          .describe("URLs de referência (image-to-image)"),
        start_generation: z
          .boolean()
          .optional()
          .describe("Dispara Kie (padrão true)"),
      },
    },
    async (args) => {
      try {
        const block = await mcpCreateImage(tenantId, {
          storyboardId: args.storyboard_id,
          prompt: args.prompt,
          resolution: args.resolution,
          aspectRatio: args.aspect_ratio,
          modelKey: args.model_key,
          referenceUrls: args.reference_urls,
          startGeneration: args.start_generation,
        });
        return jsonText({ block });
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "create_video_take",
    {
      description: `Cria um take de vídeo (Grok 1.5 / Seedance) a partir de uma imagem.
Passe source_block_id da imagem pronta. start_generation padrão false — espere a imagem success.`,
      inputSchema: {
        storyboard_id: z.string(),
        prompt: z.string().min(1),
        source_block_id: z
          .string()
          .optional()
          .describe("Bloco de imagem de origem"),
        reference_urls: z.array(z.string().url()).optional(),
        model_key: z
          .enum(["grok_15", "seedance_15", "seedance_2"])
          .optional()
          .describe("Padrão grok_15"),
        resolution: z
          .enum(["480p", "720p", "1080p"])
          .optional()
          .describe("Padrão 720p"),
        aspect_ratio: z.string().optional(),
        duration: z.number().optional().describe("Segundos (padrão 8)"),
        start_generation: z.boolean().optional().describe("Padrão false"),
      },
    },
    async (args) => {
      try {
        const block = await mcpCreateVideoTake(tenantId, {
          storyboardId: args.storyboard_id,
          prompt: args.prompt,
          sourceBlockId: args.source_block_id,
          referenceUrls: args.reference_urls,
          modelKey: args.model_key,
          resolution: args.resolution,
          aspectRatio: args.aspect_ratio,
          duration: args.duration,
          startGeneration: args.start_generation,
        });
        return jsonText({ block });
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "create_take_pipeline",
    {
      description: `Atalho: 1 imagem + 2 takes de vídeo no mesmo board.
image_resolution: 1K, 2K ou 4K (padrão 4K só neste pipeline completo; para imagem solta use create_image com 1K).
Depois: get_block na imagem → generate_block nos takes.`,
      inputSchema: {
        storyboard_id: z.string(),
        image_prompt: z.string(),
        take1_prompt: z.string(),
        take2_prompt: z.string(),
        base_image_url: z.string().url().optional(),
        aspect_ratio: z.string().optional(),
        image_resolution: z
          .enum(["1K", "2K", "4K"])
          .optional()
          .describe("Padrão 4K neste pipeline"),
        video_resolution: z.enum(["480p", "720p", "1080p"]).optional(),
        video_model_key: z
          .enum(["grok_15", "seedance_15", "seedance_2"])
          .optional(),
        start_image: z.boolean().optional(),
      },
    },
    async (args) => {
      try {
        return jsonText(
          await mcpCreateTakePipeline(tenantId, {
            storyboardId: args.storyboard_id,
            imagePrompt: args.image_prompt,
            take1Prompt: args.take1_prompt,
            take2Prompt: args.take2_prompt,
            baseImageUrl: args.base_image_url ?? null,
            aspectRatio: args.aspect_ratio,
            imageResolution: args.image_resolution,
            videoResolution: args.video_resolution,
            videoModelKey: args.video_model_key,
            startImage: args.start_image,
          })
        );
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "update_block",
    {
      description:
        "Atualiza prompt, resolução (1K/2K/4K ou 480p/720p/1080p), aspect, modelo ou referências de um bloco draft.",
      inputSchema: {
        storyboard_id: z.string(),
        block_id: z.string(),
        prompt: z.string().optional(),
        resolution: z.string().optional(),
        aspect_ratio: z.string().optional(),
        model_key: z.string().optional(),
        reference_urls: z.array(z.string().url()).optional(),
        source_block_id: z.string().nullable().optional(),
      },
    },
    async (args) => {
      try {
        const block = await mcpUpdateBlock(tenantId, {
          storyboardId: args.storyboard_id,
          blockId: args.block_id,
          prompt: args.prompt,
          resolution: args.resolution,
          aspectRatio: args.aspect_ratio,
          modelKey: args.model_key,
          referenceUrls: args.reference_urls,
          sourceBlockId: args.source_block_id,
        });
        return jsonText({ block });
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "generate_block",
    {
      description:
        "Dispara geração Kie de um bloco. Pode sobrescrever resolution (1K/2K/4K ou 480p/720p/1080p) e duration.",
      inputSchema: {
        storyboard_id: z.string(),
        block_id: z.string(),
        prompt: z.string().optional(),
        resolution: z.string().optional(),
        duration: z.number().optional(),
      },
    },
    async ({ storyboard_id, block_id, prompt, resolution, duration }) => {
      try {
        const block = await mcpStartGeneration(tenantId, {
          storyboardId: storyboard_id,
          blockId: block_id,
          prompt,
          resolution,
          duration,
        });
        return jsonText({ block });
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "get_block",
    {
      description:
        "Consulta status de um bloco e sincroniza com a Kie se ainda estiver gerando.",
      inputSchema: {
        storyboard_id: z.string(),
        block_id: z.string(),
      },
    },
    async ({ storyboard_id, block_id }) => {
      try {
        const existing = await getBlockById(tenantId, block_id);
        if (!existing || existing.storyboardId !== storyboard_id) {
          return errText(new Error("Bloco não encontrado."));
        }
        if (
          existing.kieTaskId &&
          (existing.status === "queued" || existing.status === "generating")
        ) {
          const block = await mcpSyncBlock(tenantId, block_id);
          return jsonText({ block: block ?? existing });
        }
        return jsonText({ block: existing });
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "delete_block",
    {
      description: "Remove um bloco do storyboard.",
      inputSchema: {
        storyboard_id: z.string(),
        block_id: z.string(),
      },
    },
    async ({ storyboard_id, block_id }) => {
      try {
        return jsonText(
          await mcpDeleteBlock(tenantId, {
            storyboardId: storyboard_id,
            blockId: block_id,
          })
        );
      } catch (e) {
        return errText(e);
      }
    }
  );

  return server;
}
