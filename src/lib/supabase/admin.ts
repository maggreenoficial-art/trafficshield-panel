import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

let adminClient: SupabaseClient | null = null;

export function createAdminClient(): SupabaseClient {
  const serviceKey = getSupabaseServiceRoleKey();
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY não configurada. Adicione em .env.local (Supabase → Settings → API)."
    );
  }

  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  return adminClient;
}

export function hasAdminClient(): boolean {
  return Boolean(getSupabaseServiceRoleKey());
}
