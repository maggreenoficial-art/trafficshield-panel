import { NextResponse, type NextRequest } from "next/server";
import { getTenantById } from "@/lib/db/tenants";
import type { PanelContext } from "@/lib/tenant/types";

const PRINCIPAL_TENANT = "00000000-0000-0000-0000-000000000001";

export function getMcpToken() {
  return (
    process.env.NORAT_MCP_TOKEN?.trim() ||
    process.env.TRAFFIC_INTERNAL_SECRET?.trim() ||
    ""
  );
}

/** Auth do Claude MCP: Bearer com NORAT_MCP_TOKEN (ou TRAFFIC_INTERNAL_SECRET). */
export async function requireMcpAuth(
  request: NextRequest
): Promise<PanelContext | NextResponse> {
  const expected = getMcpToken();
  if (!expected) {
    return NextResponse.json(
      {
        error:
          "NORAT_MCP_TOKEN não configurado no servidor. Defina a variável na Vercel.",
      },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim() ?? "";
  if (!token || token !== expected) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const tenant =
    (await getTenantById(PRINCIPAL_TENANT)) ??
    ({
      id: PRINCIPAL_TENANT,
      name: "Conta principal",
      slug: "principal",
      plan: "enterprise" as const,
      domainSlotLimit: 99,
      status: "active" as const,
      createdAt: new Date().toISOString(),
      subscriptionStartsAt: null,
      subscriptionEndsAt: null,
      billingInterval: "monthly" as const,
    });

  return {
    userId: "mcp-claude",
    email: "mcp@norat.local",
    tenantId: PRINCIPAL_TENANT,
    tenant,
    memberRole: "owner",
    isPlatformAdmin: true,
    memberships: [],
  };
}
