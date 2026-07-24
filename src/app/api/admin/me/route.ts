import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";

export async function GET(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  return NextResponse.json({
    userId: ctx.userId,
    email: ctx.email,
    tenantId: ctx.tenantId,
    tenant: ctx.tenant,
    memberRole: ctx.memberRole,
    isPlatformAdmin: ctx.isPlatformAdmin,
    memberships: ctx.memberships.map((m) => ({
      tenantId: m.tenantId,
      role: m.role,
      tenant: m.tenant,
    })),
  });
}
