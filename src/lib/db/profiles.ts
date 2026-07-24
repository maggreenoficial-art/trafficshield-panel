import { createAdminClient } from "@/lib/supabase/admin";

export interface Profile {
  id: string;
  email: string;
  role: "customer" | "admin";
}

type ProfileRow = {
  id: string;
  email: string;
  role: "customer" | "admin";
};

export async function getProfileById(id: string): Promise<Profile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, role")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  const row = data as ProfileRow;
  return { id: row.id, email: row.email, role: row.role };
}
