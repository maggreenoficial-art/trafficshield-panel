export const TENANT_COOKIE = "norat_tenant_id";

export type TenantPlan = "starter" | "pro" | "enterprise";
export type TenantMemberRole = "owner" | "admin" | "member";
export type TenantStatus = "active" | "suspended" | "cancelled";

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: TenantPlan;
  domainSlotLimit: number;
  status: TenantStatus;
  createdAt: string;
}

export interface TenantMembership {
  tenantId: string;
  userId: string;
  role: TenantMemberRole;
  tenant: Tenant;
}

export interface PanelContext {
  userId: string;
  email: string;
  tenantId: string;
  tenant: Tenant;
  memberRole: TenantMemberRole;
  isPlatformAdmin: boolean;
  memberships: TenantMembership[];
}
