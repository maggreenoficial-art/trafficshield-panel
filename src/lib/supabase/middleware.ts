import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getProfileById } from "@/lib/db/profiles";
import { getUserMemberships } from "@/lib/db/tenants";
import { hasAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return { supabase: null, user: null, supabaseResponse };
  }

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { supabase, user, supabaseResponse };
}

export async function isAdminUser(
  supabase: ReturnType<typeof createServerClient<Database>> | null,
  userId: string
): Promise<boolean> {
  if (!supabase || !userId) return false;
  if (hasAdminClient()) {
    const profile = await getProfileById(userId);
    return profile?.role === "admin";
  }

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single<{ role: string }>();
  return data?.role === "admin";
}

/** Acesso ao painel: admin da plataforma ou membro de algum workspace */
export async function canAccessPanel(userId: string): Promise<boolean> {
  if (!userId) return false;
  if (hasAdminClient()) {
    const profile = await getProfileById(userId);
    if (profile?.role === "admin") return true;
    const memberships = await getUserMemberships(userId);
    return memberships.length > 0;
  }
  return false;
}
