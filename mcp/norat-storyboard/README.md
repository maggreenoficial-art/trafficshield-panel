# norat Storyboard MCP

Liga o **Claude** (conector remoto / Desktop / Code) ao storyboard do [norat](https://www.norat.cloud) para o Claude escrever e disparar takes de criativos (imagem 4K + 2 vídeos Grok 1.5 de 8s).

## Claude.ai — conector personalizado (HTTPS)

Essa tela pede URL HTTPS (não o `node server.mjs` local).

1. **Nome:** `norat Storyboard`
2. **URL do servidor MCP:** `https://www.norat.cloud/api/mcp`
3. Em autenticação: **Sem login** / No sign-in
4. Em headers / credencial, adicione:
   - Header: `Authorization`
   - Valor: `Bearer SEU_NORAT_MCP_TOKEN`

## Fluxo típico

1. `list_storyboards` ou `create_storyboard`
2. Claude escreve os 3 prompts → `create_take_pipeline`
3. `get_block` na imagem até `status=success`
4. `generate_block` no take1 e take2
5. `get_block` nos takes até concluir

## Pré-requisitos

1. Na **Vercel**, defina `NORAT_MCP_TOKEN` (secret forte). Em fallback a API aceita `TRAFFIC_INTERNAL_SECRET`.
2. Node.js 18+ na máquina onde o Claude roda o MCP.

## Instalação

```bash
cd mcp/norat-storyboard
npm install
```

## Claude Desktop

Edite `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`):

```json
{
  "mcpServers": {
    "norat-storyboard": {
      "command": "node",
      "args": [
        "C:/Users/HUMBERTO/trafficshield-panel/mcp/norat-storyboard/server.mjs"
      ],
      "env": {
        "NORAT_BASE_URL": "https://www.norat.cloud",
        "NORAT_MCP_TOKEN": "o-mesmo-token-da-vercel"
      }
    }
  }
}
```

Reinicie o Claude Desktop. As tools `norat-storyboard` devem aparecer.

## Claude Code

```bash
claude mcp add norat-storyboard --env NORAT_BASE_URL=https://www.norat.cloud --env NORAT_MCP_TOKEN=seu-token -- node /caminho/completo/mcp/norat-storyboard/server.mjs
```

## Tools

| Tool | Uso |
|------|-----|
| `list_capabilities` | Modelos + resoluções (imagem **1K/2K/4K**, vídeo 480p/720p/1080p) |
| `list_storyboards` | Boards + créditos Kie |
| `get_storyboard` | Blocos e status |
| `create_storyboard` | Novo board |
| `create_image` | Imagem solta — **padrão 1K** (também 2K/4K) |
| `create_video_take` | Take de vídeo (Grok / Seedance) a partir de imagem |
| `create_take_pipeline` | Atalho imagem + 2 takes (`image_resolution` 1K/2K/4K) |
| `update_block` | Prompt / resolução / aspect / modelo |
| `generate_block` | Dispara Kie (aceita `resolution`) |
| `get_block` | Poll / sync status |
| `delete_block` | Remove bloco |

## Auth

O cliente MCP envia `Authorization: Bearer <NORAT_MCP_TOKEN>` para `/api/mcp/storyboards/*`. O middleware do painel deixa essas rotas públicas; a autenticação é só pelo Bearer na rota.
