import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type {
  DevDoc,
  DevPlan,
  DevReferencePage,
  ProductDevelopment,
} from "@/lib/product-dev/types";

type Row = {
  id: string;
  tenant_id: string;
  name: string;
  brief: string;
  docs: unknown;
  reference_pages: unknown;
  plan: unknown;
  page_html: string | null;
  storyboard_id: string | null;
  publish_hostname: string | null;
  publish_path: string | null;
  status: ProductDevelopment["status"];
  created_at: string;
  updated_at: string;
};

function asDocs(value: unknown): DevDoc[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as { slot?: unknown; name?: unknown; text?: unknown };
      const slot = row.slot === 2 || row.slot === 3 ? row.slot : 1;
      const text = typeof row.text === "string" ? row.text : "";
      if (!text.trim()) return null;
      return {
        slot,
        name: typeof row.name === "string" ? row.name : `Documento ${slot}`,
        text,
      };
    })
    .filter((d): d is DevDoc => Boolean(d));
}

function asPages(value: unknown): DevReferencePage[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const row = item as { url?: unknown; title?: unknown; text?: unknown };
      const text = typeof row.text === "string" ? row.text : "";
      const url = typeof row.url === "string" ? row.url : "";
      if (!text.trim() && !url.trim()) return null;
      return {
        url,
        title: typeof row.title === "string" ? row.title : url,
        text,
      };
    })
    .filter((p): p is DevReferencePage => Boolean(p));
}

function mapRow(row: Row): ProductDevelopment {
  const plan =
    row.plan && typeof row.plan === "object" ? (row.plan as DevPlan) : null;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    brief: row.brief ?? "",
    docs: asDocs(row.docs),
    referencePages: asPages(row.reference_pages),
    plan,
    pageHtml: row.page_html ?? "",
    storyboardId: row.storyboard_id,
    publishHostname: row.publish_hostname,
    publishPath: row.publish_path || "/",
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function missingTable(error: { message?: string } | null) {
  return Boolean(error?.message?.includes("product_developments"));
}

export async function listProductDevelopments(
  tenantId: string
): Promise<Pick<ProductDevelopment, "id" | "name" | "status" | "updatedAt">[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_developments")
    .select("id, name, status, updated_at")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false })
    .limit(40);
  if (error) {
    if (missingTable(error)) return [];
    throw error;
  }
  return (data ?? []).map((row) => ({
    id: row.id as string,
    name: row.name as string,
    status: row.status as ProductDevelopment["status"],
    updatedAt: row.updated_at as string,
  }));
}

export async function getProductDevelopment(
  tenantId: string,
  id: string
): Promise<ProductDevelopment | null> {
  if (!hasAdminClient()) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_developments")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapRow(data as Row) : null;
}

export async function createProductDevelopment(
  tenantId: string,
  createdBy: string,
  input: { name: string; brief?: string }
): Promise<ProductDevelopment> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("product_developments")
    .insert({
      tenant_id: tenantId,
      created_by: createdBy,
      name: input.name.trim(),
      brief: input.brief?.trim() ?? "",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data as Row);
}

export async function updateProductDevelopment(
  tenantId: string,
  id: string,
  patch: Partial<{
    name: string;
    brief: string;
    docs: DevDoc[];
    referencePages: DevReferencePage[];
    plan: DevPlan | null;
    pageHtml: string;
    storyboardId: string | null;
    publishHostname: string | null;
    publishPath: string;
    status: ProductDevelopment["status"];
  }>
): Promise<ProductDevelopment> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.brief !== undefined) row.brief = patch.brief;
  if (patch.docs !== undefined) row.docs = patch.docs;
  if (patch.referencePages !== undefined) row.reference_pages = patch.referencePages;
  if (patch.plan !== undefined) row.plan = patch.plan;
  if (patch.pageHtml !== undefined) row.page_html = patch.pageHtml;
  if (patch.storyboardId !== undefined) row.storyboard_id = patch.storyboardId;
  if (patch.publishHostname !== undefined) row.publish_hostname = patch.publishHostname;
  if (patch.publishPath !== undefined) row.publish_path = patch.publishPath;
  if (patch.status !== undefined) row.status = patch.status;
  const { data, error } = await supabase
    .from("product_developments")
    .update(row)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapRow(data as Row);
}

function normalizePath(path: string) {
  const trimmed = path.trim() || "/";
  if (!trimmed.startsWith("/")) return `/${trimmed}`;
  if (trimmed.length > 1 && trimmed.endsWith("/")) return trimmed.slice(0, -1);
  return trimmed;
}

export async function getPublishedProductHtml(
  hostname: string,
  pathname: string
): Promise<string | null> {
  if (!hasAdminClient()) return null;
  const supabase = createAdminClient();
  const host = hostname.toLowerCase().replace(/^www\./, "");
  const path = normalizePath(pathname);
  const { data, error } = await supabase
    .from("product_developments")
    .select("page_html, publish_hostname, publish_path, updated_at")
    .eq("status", "published")
    .order("updated_at", { ascending: false })
    .limit(80);
  if (error || !data) return null;
  const match = data.find((row) => {
    const stored = String(row.publish_hostname ?? "")
      .toLowerCase()
      .replace(/^www\./, "");
    const storedPath = normalizePath(String(row.publish_path ?? "/"));
    return stored === host && storedPath === path && Boolean(row.page_html);
  });
  return match ? String(match.page_html) : null;
}
