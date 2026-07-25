/**
 * Cria usuário + workspace com plano starter.
 * Uso: node --env-file=.env.local scripts/create-starter-client.mjs [email] [senha] [nome-workspace]
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local");
  process.exit(1);
}

const email = (process.argv[2] || `cliente.starter+${Date.now()}@norat.io`).trim().toLowerCase();
const password = process.argv[3] || `Norat@${randomBytes(3).toString("hex")}2026!`;
const workspaceName = process.argv[4] || `Workspace ${email.split("@")[0]}`;

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

async function main() {
  console.log("Criando cliente starter...\n");

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { company_name: workspaceName },
  });

  if (createError || !created.user) {
    console.error("Erro ao criar usuário:", createError?.message ?? "desconhecido");
    process.exit(1);
  }

  const userId = created.user.id;

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: userId,
      email,
      role: "analista",
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  if (profileError) {
    console.error("Erro ao criar perfil:", profileError.message);
    process.exit(1);
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
    console.error("Erro ao criar tenant:", tenantError?.message ?? "desconhecido");
    process.exit(1);
  }

  const { error: memberError } = await supabase.from("tenant_members").insert({
    tenant_id: tenant.id,
    user_id: userId,
    role: "owner",
  });

  if (memberError) {
    console.error("Erro ao vincular membro:", memberError.message);
    process.exit(1);
  }

  const { error: configError } = await supabase.from("app_config").insert({
    key: "traffic_shield",
    tenant_id: tenant.id,
    value: defaultShieldConfig,
  });

  if (configError) {
    console.error("Erro ao criar config:", configError.message);
    process.exit(1);
  }

  console.log("Conta criada com sucesso!\n");
  console.log("--- Credenciais ---");
  console.log(`E-mail:    ${email}`);
  console.log(`Senha:     ${password}`);
  console.log("\n--- Workspace ---");
  console.log(`Nome:      ${tenant.name}`);
  console.log(`Slug:      ${tenant.slug}`);
  console.log(`Plano:     ${tenant.plan}`);
  console.log(`Domínios:  ${tenant.domain_slot_limit} slots`);
  console.log(`Status:    ${tenant.status}`);
  console.log(`Tenant ID: ${tenant.id}`);
  console.log(`User ID:   ${userId}`);
  console.log("\nLogin: /login");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
