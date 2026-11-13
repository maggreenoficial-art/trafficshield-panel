#!/usr/bin/env node
/**
 * MCP stdio — Claude Desktop / Claude Code → API HTTPS do norat Storyboard.
 *
 * Env:
 *   NORAT_BASE_URL   ex: https://www.norat.cloud
 *   NORAT_MCP_TOKEN  mesmo valor de NORAT_MCP_TOKEN (ou TRAFFIC_INTERNAL_SECRET) na Vercel
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const BASE = (process.env.NORAT_BASE_URL || "https://www.norat.cloud").replace(
  /\/$/,
  ""
);
const TOKEN = process.env.NORAT_MCP_TOKEN?.trim() || "";

if (!TOKEN) {
  console.error(
    "[norat-storyboard-mcp] Defina NORAT_MCP_TOKEN (igual ao da Vercel)."
  );
  process.exit(1);
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err =
      data?.error ||
      data?.message ||
      `HTTP ${res.status} em ${method} ${path}`;
    throw new Error(typeof err === "string" ? err : JSON.stringify(err));
  }
  return data;
}

function jsonResult(data) {
  return {
    content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
  };
}

const server = new McpServer({
  name: "norat-storyboard",
  version: "1.0.0",
});

server.tool(
  "list_storyboards",
  "Lista storyboards da conta principal norat e créditos Kie disponíveis.",
  {},
  async () => jsonResult(await api("/api/mcp/storyboards"))
);

server.tool(
  "get_storyboard",
  "Detalhe de um storyboard: blocos (imagem + takes), status e créditos.",
  { storyboard_id: z.string().describe("UUID do storyboard") },
  async ({ storyboard_id }) =>
    jsonResult(await api(`/api/mcp/storyboards/${storyboard_id}`))
);

server.tool(
  "create_storyboard",
  "Cria um storyboard novo (ex.: campanha / criativo).",
  {
    name: z.string().min(1).describe("Nome curto do board"),
    description: z.string().optional().describe("Descrição opcional"),
  },
  async ({ name, description }) =>
    jsonResult(
      await api("/api/mcp/storyboards", {
        method: "POST",
        body: { name, description },
      })
    )
);

server.tool(
  "create_take_pipeline",
  `Monta no storyboard: 1 imagem 4K + 2 takes de vídeo Grok 1.5 (8s cada).
Você (Claude) escreve imagePrompt, take1Prompt e take2Prompt no idioma pedido pelo usuário.
Por padrão já inicia a geração da imagem. Depois: poll get_block até success, então generate_block em cada take.`,
  {
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
    aspect_ratio: z
      .string()
      .optional()
      .describe("Padrão 9:16"),
    start_image: z
      .boolean()
      .optional()
      .describe("Inicia geração da imagem (padrão true)"),
  },
  async (args) =>
    jsonResult(
      await api(`/api/mcp/storyboards/${args.storyboard_id}/produce-takes`, {
        method: "POST",
        body: {
          imagePrompt: args.image_prompt,
          take1Prompt: args.take1_prompt,
          take2Prompt: args.take2_prompt,
          baseImageUrl: args.base_image_url ?? null,
          aspectRatio: args.aspect_ratio,
          startImage: args.start_image,
        },
      })
    )
);

server.tool(
  "generate_block",
  "Dispara geração Kie de um bloco (imagem ou take). Nos takes, espere a imagem source estar success.",
  {
    storyboard_id: z.string(),
    block_id: z.string(),
    prompt: z.string().optional().describe("Sobrescreve o prompt do bloco"),
    duration: z.number().optional().describe("Segundos do vídeo (padrão 8)"),
  },
  async ({ storyboard_id, block_id, prompt, duration }) =>
    jsonResult(
      await api(`/api/mcp/storyboards/${storyboard_id}/generate`, {
        method: "POST",
        body: { blockId: block_id, prompt, duration },
      })
    )
);

server.tool(
  "get_block",
  "Consulta status de um bloco e sincroniza com a Kie se ainda estiver gerando.",
  {
    storyboard_id: z.string(),
    block_id: z.string(),
  },
  async ({ storyboard_id, block_id }) =>
    jsonResult(
      await api(
        `/api/mcp/storyboards/${storyboard_id}/blocks/${block_id}`
      )
    )
);

const transport = new StdioServerTransport();
await server.connect(transport);
