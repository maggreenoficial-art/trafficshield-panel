import { createAdminClient } from "@/lib/supabase/admin";
import type {
  Tenant,
  TenantMemberRole,
  TenantMembership,
} from "@/lib/tenant/types";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  plan: Tenant["plan"];
  domain_slot_limit: number;
  status: Tenant["status"];
  created_at: string;
};

type MemberRow = {
  tenant_id: string;
  user_id: string;
  role: TenantMemberRole;
  tenants: TenantRow;
};

function rowToTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    plan: row.plan,
    domainSlotLimit: row.domain_slot_limit,
    status: row.status,
    createdAt: row.created_at,
  };
}

function slugify(input: string): string {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

export async function getUserMemberships(
  userId: string
): Promise<TenantMembership[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tenant_members")
    .select("tenant_id, user_id, role, tenants(*)")
    .eq("user_id", userId);

  if (error || !data) return [];

  return (data as unknown as MemberRow[]).map((row) => ({
    tenantId: row.tenant_id,
    userId: row.user_id,
    role: row.role,
    tenant: rowToTenant(row.tenants),
  }));
}

export async function userHasTenantAccess(
  userId: string,
  tenantId: string
): Promise<boolean> {
  const memberships = await getUserMemberships(userId);
  return memberships.some((m) => m.tenantId === tenantId);
}

export async function getTenantById(id: string): Promise<Tenant | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) return null;
  return rowToTenant(data as TenantRow);
}

export async function createTenantForUser(input: {
  userId: string;
  name: string;
  email: string;
}): Promise<TenantMembership> {
  const supabase = createAdminClient();
  const suffix = Math.random().toString(36).slice(2, 7);
  const slug = `${slugify(input.name || input.email.split("@")[0])}-${suffix}`;

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: input.name.trim() || `Workspace de ${input.email.split("@")[0]}`,
      slug,
      plan: "starter",
      domain_slot_limit: 3,
      status: "active",
    })
    .select("*")
    .single();

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? "Erro ao criar workspace.");
  }

  const tenantId = (tenant as TenantRow).id;

  const { error: memberError } = await supabase.from("tenant_members").insert({
    tenant_id: tenantId,
    user_id: input.userId,
    role: "owner",
  });

  if (memberError) {
    throw new Error(memberError.message);
  }

  await supabase.from("app_config").insert({
    key: "traffic_shield",
    tenant_id: tenantId,
    value: {
      enabled: true,
      mode: "protect",
      blockBots: true,
      blockScrapers: true,
      blockHeadless: true,
      blockEmptyUa: true,
      allowSearchEngines: true,
      protectCampaigns: true,
      hidePricingFromBots: true,
      blockThreshold: 75,
      suspiciousThreshold: 45,
      safePagePath: "/",
      allowedCountries: [],
      blockedCountries: [],
      ipWhitelist: [],
      ipBlacklist: [],
      mlSensitivity: 0.7,
    },
  });

  return {
    tenantId,
    userId: input.userId,
    role: "owner",
    tenant: rowToTenant(tenant as TenantRow),
  };
}
