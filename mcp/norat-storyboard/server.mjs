#!/usr/bin/env node
/**
 * MCP stdio — Claude Desktop / Claude Code → API HTTPS do norat Storyboard.
 *
 * Env:
 *   NORAT_BASE_URL   ex: https://www.norat.cloud
 *   NORAT_MCP_TOKEN  mesmo valor de NORAT_MCP_TOKEN na Vercel
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
  version: "1.1.0",
});

server.tool(
  "list_capabilities",
  "Lista modelos e resoluções (imagem 1K/2K/4K; vídeo 480p/720p/1080p).",
  {},
  async () => jsonResult(await api("/api/mcp/capabilities"))
);

server.tool(
  "list_storyboards",
  "Lista storyboards, créditos Kie e capabilities.",
  {},
  async () => jsonResult(await api("/api/mcp/storyboards"))
);

server.tool(
  "get_storyboard",
  "Detalhe de um storyboard: blocos, status e créditos.",
  { storyboard_id: z.string() },
  async ({ storyboard_id }) =>
    jsonResult(await api(`/api/mcp/storyboards/${storyboard_id}`))
);

server.tool(
  "create_storyboard",
  "Cria um storyboard novo.",
  {
    name: z.string().min(1),
    description: z.string().optional(),
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
  "create_image",
  "Cria/gera imagem. resolution: 1K (padrão), 2K ou 4K. NÃO force 4K.",
  {
    storyboard_id: z.string(),
    prompt: z.string().min(1),
    resolution: z.enum(["1K", "2K", "4K"]).optional(),
    aspect_ratio: z.string().optional(),
    model_key: z.enum(["image", "image_hq", "logo"]).optional(),
    reference_urls: z.array(z.string().url()).optional(),
    start_generation: z.boolean().optional(),
  },
  async (args) =>
    jsonResult(
      await api(`/api/mcp/storyboards/${args.storyboard_id}/blocks`, {
        method: "POST",
        body: {
          kind: "image",
          prompt: args.prompt,
          resolution: args.resolution,
          aspectRatio: args.aspect_ratio,
          modelKey: args.model_key,
          referenceUrls: args.reference_urls,
          startGeneration: args.start_generation,
        },
      })
    )
);

server.tool(
  "create_video_take",
  "Cria take de vídeo a partir de imagem (source_block_id).",
  {
    storyboard_id: z.string(),
    prompt: z.string().min(1),
    source_block_id: z.string().optional(),
    reference_urls: z.array(z.string().url()).optional(),
    model_key: z.enum(["grok_15", "seedance_15", "seedance_2"]).optional(),
    resolution: z.enum(["480p", "720p", "1080p"]).optional(),
    aspect_ratio: z.string().optional(),
    duration: z.number().optional(),
    start_generation: z.boolean().optional(),
  },
  async (args) =>
    jsonResult(
      await api(`/api/mcp/storyboards/${args.storyboard_id}/blocks`, {
        method: "POST",
        body: {
          kind: "video",
          prompt: args.prompt,
          sourceBlockId: args.source_block_id,
          referenceUrls: args.reference_urls,
          modelKey: args.model_key,
          resolution: args.resolution,
          aspectRatio: args.aspect_ratio,
          duration: args.duration,
          startGeneration: args.start_generation,
        },
      })
    )
);

server.tool(
  "create_take_pipeline",
  "Atalho: imagem + 2 takes. image_resolution 1K/2K/4K (padrão 4K neste atalho).",
  {
    storyboard_id: z.string(),
    image_prompt: z.string(),
    take1_prompt: z.string(),
    take2_prompt: z.string(),
    base_image_url: z.string().url().optional(),
    aspect_ratio: z.string().optional(),
    image_resolution: z.enum(["1K", "2K", "4K"]).optional(),
    video_resolution: z.enum(["480p", "720p", "1080p"]).optional(),
    video_model_key: z
      .enum(["grok_15", "seedance_15", "seedance_2"])
      .optional(),
    start_image: z.boolean().optional(),
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
          imageResolution: args.image_resolution,
          videoResolution: args.video_resolution,
          videoModelKey: args.video_model_key,
          startImage: args.start_image,
        },
      })
    )
);

server.tool(
  "update_block",
  "Atualiza prompt/resolução/aspect/modelo de um bloco.",
  {
    storyboard_id: z.string(),
    block_id: z.string(),
    prompt: z.string().optional(),
    resolution: z.string().optional(),
    aspect_ratio: z.string().optional(),
    model_key: z.string().optional(),
    reference_urls: z.array(z.string().url()).optional(),
    source_block_id: z.string().nullable().optional(),
  },
  async (args) =>
    jsonResult(
      await api(
        `/api/mcp/storyboards/${args.storyboard_id}/blocks/${args.block_id}`,
        {
          method: "PATCH",
          body: {
            prompt: args.prompt,
            resolution: args.resolution,
            aspectRatio: args.aspect_ratio,
            modelKey: args.model_key,
            referenceUrls: args.reference_urls,
            sourceBlockId: args.source_block_id,
          },
        }
      )
    )
);

server.tool(
  "generate_block",
  "Dispara geração Kie. Pode passar resolution e duration.",
  {
    storyboard_id: z.string(),
    block_id: z.string(),
    prompt: z.string().optional(),
    resolution: z.string().optional(),
    duration: z.number().optional(),
  },
  async ({ storyboard_id, block_id, prompt, resolution, duration }) =>
    jsonResult(
      await api(`/api/mcp/storyboards/${storyboard_id}/generate`, {
        method: "POST",
        body: { blockId: block_id, prompt, resolution, duration },
      })
    )
);

server.tool(
  "get_block",
  "Status/sync de um bloco.",
  {
    storyboard_id: z.string(),
    block_id: z.string(),
  },
  async ({ storyboard_id, block_id }) =>
    jsonResult(
      await api(`/api/mcp/storyboards/${storyboard_id}/blocks/${block_id}`)
    )
);

server.tool(
  "delete_block",
  "Remove um bloco do storyboard.",
  {
    storyboard_id: z.string(),
    block_id: z.string(),
  },
  async ({ storyboard_id, block_id }) =>
    jsonResult(
      await api(`/api/mcp/storyboards/${storyboard_id}/blocks/${block_id}`, {
        method: "DELETE",
      })
    )
);

const transport = new StdioServerTransport();
await server.connect(transport);
