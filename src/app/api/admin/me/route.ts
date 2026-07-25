import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { getDomainSlotInfo } from "@/lib/db/traffic-campaigns";

export async function GET(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  const slots = await getDomainSlotInfo(ctx.tenantId);

  return NextResponse.json({
    userId: ctx.userId,
    email: ctx.email,
    tenantId: ctx.tenantId,
    tenant: ctx.tenant,
    memberRole: ctx.memberRole,
    isPlatformAdmin: ctx.isPlatformAdmin,
    slots,
    memberships: ctx.memberships.map((m) => ({
      tenantId: m.tenantId,
      role: m.role,
      tenant: m.tenant,
    })),
  });
}
