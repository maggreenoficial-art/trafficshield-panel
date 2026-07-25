/**
 * Provisiona workspace starter para usuário já existente no Auth.
 * Uso: node --env-file=.env.local scripts/provision-starter-tenant.mjs <email> [nome-workspace] [nova-senha]
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const email = (process.argv[2] || "").trim().toLowerCase();
const workspaceName = process.argv[3] || "Cliente Starter";
const newPassword = process.argv[4];

if (!email) {
  console.error("Uso: node --env-file=.env.local scripts/provision-starter-tenant.mjs <email> [nome-workspace] [nova-senha]");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function slugify(input) {
  const base = input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return base || "workspace";
}

const defaultShieldConfig = {
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
};

async function findUserByEmail(targetEmail) {
  let page = 1;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const user = data.users.find((u) => u.email?.toLowerCase() === targetEmail);
    if (user) return user;
    if (data.users.length < 200) break;
    page += 1;
  }
  return null;
}

async function main() {
  const user = await findUserByEmail(email);
  if (!user) {
    console.error(`Usuário não encontrado no Auth: ${email}`);
    process.exit(1);
  }

  const { data: existingMemberships } = await supabase
    .from("tenant_members")
    .select("tenant_id, tenants(name, plan, slug)")
    .eq("user_id", user.id);

  if (existingMemberships?.length) {
    console.log("Usuário já possui workspace(s):");
    for (const row of existingMemberships) {
      console.log(`- ${row.tenants?.name} (${row.tenants?.plan}) [${row.tenants?.slug}]`);
    }
    process.exit(0);
  }

  const suffix = Math.random().toString(36).slice(2, 7);
  const slug = `${slugify(workspaceName)}-${suffix}`;
  const now = new Date();
  const subscriptionEndsAt = new Date(now);
  subscriptionEndsAt.setDate(subscriptionEndsAt.getDate() + 30);

  const { data: tenant, error: tenantError } = await supabase
    .from("tenants")
    .insert({
      name: workspaceName,
      slug,
      plan: "starter",
      domain_slot_limit: 3,
      status: "active",
      subscription_starts_at: now.toISOString(),
      subscription_ends_at: subscriptionEndsAt.toISOString(),
      billing_interval: "monthly",
    })
    .select("*")
    .single();

  if (tenantError || !tenant) {
    throw new Error(tenantError?.message ?? "Erro ao criar tenant.");
  }

  const { error: memberError } = await supabase.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) throw new Error(memberError.message);

  const { error: configError } = await supabase.from("app_config").insert({
    key: "traffic_shield",
    tenant_id: tenant.id,
    value: defaultShieldConfig,
  });

  if (configError) throw new Error(configError.message);

  await supabase.from("profiles").upsert(
    {
      id: user.id,
      email,
      role: "analista",
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (newPassword) {
    const { error: passError } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true,
    });
    if (passError) throw new Error(passError.message);
  }

  console.log("Workspace starter criado!\n");
  console.log(`E-mail:      ${email}`);
  if (newPassword) console.log(`Senha:       ${newPassword}`);
  console.log(`Workspace:   ${tenant.name}`);
  console.log(`Plano:       ${tenant.plan}`);
  console.log(`Domínios:    ${tenant.domain_slot_limit} slots`);
  console.log(`Slug:        ${tenant.slug}`);
  console.log(`Tenant ID:   ${tenant.id}`);
  console.log(`User ID:     ${user.id}`);
  console.log("\nLogin: /login");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
