import { NextResponse, type NextRequest } from "next/server";
import { getProfileById } from "@/lib/db/profiles";
import {
  getTenantById,
  getUserMemberships,
  userHasTenantAccess,
} from "@/lib/db/tenants";
import { hasAdminClient } from "@/lib/supabase/admin";
import { updateSession } from "@/lib/supabase/middleware";
import type { PanelContext } from "@/lib/tenant/types";
import { TENANT_COOKIE } from "@/lib/tenant/types";

export async function resolvePanelContext(
  request: NextRequest
): Promise<PanelContext | null> {
  const { user } = await updateSession(request);
  if (!user) return null;

  const profile = hasAdminClient()
    ? await getProfileById(user.id)
    : null;

  if (!profile && hasAdminClient()) return null;
  if (!profile) return null;

  const memberships = await getUserMemberships(user.id);
  const isPlatformAdmin = profile.role === "admin";

  if (!memberships.length && !isPlatformAdmin) return null;

  let tenantId = request.cookies.get(TENANT_COOKIE)?.value ?? null;

  if (
    tenantId &&
    !memberships.some((m) => m.tenantId === tenantId) &&
    !isPlatformAdmin
  ) {
    tenantId = null;
  }

  if (!tenantId && memberships.length > 0) {
    tenantId = memberships[0].tenantId;
  }

  if (!tenantId && isPlatformAdmin) {
    tenantId = "00000000-0000-0000-0000-000000000001";
  }

  if (!tenantId) return null;

  const membership =
    memberships.find((m) => m.tenantId === tenantId) ?? memberships[0];

  const tenant =
    membership?.tenant ?? (await getTenantById(tenantId));
  if (!tenant) return null;

  if (tenant.status !== "active" && !isPlatformAdmin) return null;

  return {
    userId: user.id,
    email: profile.email,
    tenantId,
    tenant,
    memberRole: membership?.role ?? "owner",
    isPlatformAdmin,
    memberships,
  };
}

export function panelUnauthorized() {
  return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
}

export function panelForbidden(message = "Acesso negado a este workspace.") {
  return NextResponse.json({ error: message }, { status: 403 });
}

export async function requirePanelContext(
  request: NextRequest
): Promise<PanelContext | NextResponse> {
  const ctx = await resolvePanelContext(request);
  if (!ctx) return panelUnauthorized();
  return ctx;
}

export function setTenantCookie(
  response: NextResponse,
  tenantId: string
): NextResponse {
  response.cookies.set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function assertTenantResource(
  ctx: PanelContext,
  resourceTenantId: string | null | undefined
): Promise<boolean> {
  if (!resourceTenantId) return false;
  if (ctx.isPlatformAdmin) return true;
  return ctx.tenantId === resourceTenantId;
}

export { userHasTenantAccess };
