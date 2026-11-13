import { NextResponse, type NextRequest } from "next/server";
import { requireMcpAuth } from "@/lib/api/mcp-auth";
import { mcpListCapabilities } from "@/lib/storyboard/mcp-actions";

export async function GET(request: NextRequest) {
  const ctx = await requireMcpAuth(request);
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json(mcpListCapabilities());
}
