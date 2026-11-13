import { NextResponse, type NextRequest } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { getMcpToken } from "@/lib/api/mcp-auth";
import { createStoryboardMcpServer } from "@/lib/mcp/storyboard-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Takes podem demorar; Claude aceita até ~240s por tool. */
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json(
    {
      jsonrpc: "2.0",
      error: { code: -32001, message: "Não autorizado. Use Bearer NORAT_MCP_TOKEN." },
      id: null,
    },
    {
      status: 401,
      headers: {
        "WWW-Authenticate": 'Bearer realm="norat-mcp"',
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers":
          "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      },
    }
  );
}

function requireBearer(request: NextRequest): boolean {
  const expected = getMcpToken();
  if (!expected) return false;
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() ?? "";
  return Boolean(token && token === expected);
}

async function handleMcp(request: NextRequest): Promise<Response> {
  if (!requireBearer(request)) return unauthorized();

  const server = createStoryboardMcpServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });

  await server.connect(transport);
  const response = await transport.handleRequest(request);

  // Fecha após a resposta (stateless)
  void Promise.resolve().then(() => {
    transport.close().catch(() => undefined);
    server.close().catch(() => undefined);
  });

  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID"
  );
  headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers":
        "Authorization, Content-Type, Accept, Mcp-Session-Id, Last-Event-ID",
      "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    return await handleMcp(request);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32603, message },
        id: null,
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    return await handleMcp(request);
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      },
      { status: 405 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    return await handleMcp(request);
  } catch {
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message: "Method not allowed." },
        id: null,
      },
      { status: 405 }
    );
  }
}
