import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  mcpCreateStoryboard,
  mcpCreateTakePipeline,
  mcpGetStoryboard,
  mcpListStoryboards,
  mcpStartGeneration,
  mcpSyncBlock,
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

/** Servidor MCP remoto (Streamable HTTP) — tools do storyboard norat. */
export function createStoryboardMcpServer() {
  const tenantId = PRINCIPAL_TENANT;
  const server = new McpServer({
    name: "norat-storyboard",
    version: "1.0.0",
  });

  server.registerTool(
    "list_storyboards",
    {
      description:
        "Lista storyboards da conta principal norat e créditos Kie disponíveis.",
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
    "create_take_pipeline",
    {
      description: `Monta no storyboard: 1 imagem 4K + 2 takes de vídeo Grok 1.5 (8s cada).
Você (Claude) escreve image_prompt, take1_prompt e take2_prompt no idioma pedido.
Por padrão inicia a geração da imagem. Depois: poll get_block até success, então generate_block em cada take.`,
      inputSchema: {
        storyboard_id: z.string().describe("UUID do storyboard"),
        image_prompt: z
          .string()
          .describe("Prompt da cena estática 4K (primeiro quadro)"),
        take1_prompt: z
          .string()
          .describe("Prompt do take 1 (movimento + fala, 8s)"),
        take2_prompt: z
          .string()
          .describe("Prompt do take 2 (ângulo/variação, 8s)"),
        base_image_url: z
          .string()
          .url()
          .optional()
          .describe("URL de referência opcional para a imagem"),
        aspect_ratio: z.string().optional().describe("Padrão 9:16"),
        start_image: z
          .boolean()
          .optional()
          .describe("Inicia geração da imagem (padrão true)"),
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
            startImage: args.start_image,
          })
        );
      } catch (e) {
        return errText(e);
      }
    }
  );

  server.registerTool(
    "generate_block",
    {
      description:
        "Dispara geração Kie de um bloco (imagem ou take). Nos takes, espere a imagem source estar success.",
      inputSchema: {
        storyboard_id: z.string(),
        block_id: z.string(),
        prompt: z.string().optional().describe("Sobrescreve o prompt do bloco"),
        duration: z.number().optional().describe("Segundos do vídeo (padrão 8)"),
      },
    },
    async ({ storyboard_id, block_id, prompt, duration }) => {
      try {
        const block = await mcpStartGeneration(tenantId, {
          storyboardId: storyboard_id,
          blockId: block_id,
          prompt,
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

  return server;
}
