# norat Storyboard MCP

Liga o **Claude Desktop** / **Claude Code** ao storyboard do [norat](https://www.norat.cloud) para o Claude escrever e disparar takes de criativos (imagem 4K + 2 vídeos Grok 1.5 de 8s).

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
| `list_storyboards` | Boards + créditos Kie |
| `get_storyboard` | Blocos e status |
| `create_storyboard` | Novo board |
| `create_take_pipeline` | Imagem 4K + 2 takes (prompts do Claude) |
| `generate_block` | Dispara Kie num bloco |
| `get_block` | Poll / sync status |

## Auth

O cliente MCP envia `Authorization: Bearer <NORAT_MCP_TOKEN>` para `/api/mcp/storyboards/*`. O middleware do painel deixa essas rotas públicas; a autenticação é só pelo Bearer na rota.
