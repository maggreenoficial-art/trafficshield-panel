import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export type Creative = {
  id: string;
  tenantId: string;
  folderId: string | null;
  storyboardId: string | null;
  blockId: string | null;
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl: string | null;
  prompt: string | null;
  modelKey: string | null;
  expiresAt: string;
  createdAt: string;
};

export type CreativeFolder = {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  count?: number;
};

type CreativeRow = {
  id: string;
  tenant_id: string;
  folder_id: string | null;
  storyboard_id: string | null;
  block_id: string | null;
  media_type: "image" | "video";
  url: string;
  thumbnail_url: string | null;
  prompt: string | null;
  model_key: string | null;
  expires_at: string;
  created_at: string;
};

type FolderRow = {
  id: string;
  tenant_id: string;
  name: string;
  created_at: string;
};

function mapCreative(row: CreativeRow): Creative {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    folderId: row.folder_id,
    storyboardId: row.storyboard_id,
    blockId: row.block_id,
    mediaType: row.media_type,
    url: row.url,
    thumbnailUrl: row.thumbnail_url,
    prompt: row.prompt,
    modelKey: row.model_key,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

function mapFolder(row: FolderRow, count?: number): CreativeFolder {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    createdAt: row.created_at,
    count,
  };
}

export async function listFolders(tenantId: string): Promise<CreativeFolder[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("creative_folders")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const folders = (data as FolderRow[]) ?? [];
  const withCounts = await Promise.all(
    folders.map(async (f) => {
      const { count } = await supabase
        .from("creatives")
        .select("id", { count: "exact", head: true })
        .eq("folder_id", f.id);
      return mapFolder(f, count ?? 0);
    })
  );
  return withCounts;
}

export async function createFolder(
  tenantId: string,
  name: string
): Promise<CreativeFolder> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("creative_folders")
    .insert({ tenant_id: tenantId, name: name.trim() })
    .select("*")
    .single();
  if (error) throw error;
  return mapFolder(data as FolderRow, 0);
}

export async function listCreatives(
  tenantId: string,
  opts?: { folderId?: string | null; mediaType?: string }
): Promise<Creative[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();
  let q = supabase
    .from("creatives")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false });

  if (opts?.folderId === "none") {
    q = q.is("folder_id", null);
  } else if (opts?.folderId) {
    q = q.eq("folder_id", opts.folderId);
  }
  if (opts?.mediaType && opts.mediaType !== "all") {
    q = q.eq("media_type", opts.mediaType);
  }

  const { data, error } = await q;
  if (error) throw error;
  return ((data as CreativeRow[]) ?? []).map(mapCreative);
}

export async function countCreatives(tenantId: string): Promise<{
  all: number;
  unfiled: number;
}> {
  if (!hasAdminClient()) return { all: 0, unfiled: 0 };
  const supabase = createAdminClient();
  const { count: all } = await supabase
    .from("creatives")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const { count: unfiled } = await supabase
    .from("creatives")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("folder_id", null);
  return { all: all ?? 0, unfiled: unfiled ?? 0 };
}

export async function insertCreative(input: {
  tenantId: string;
  storyboardId?: string | null;
  blockId?: string | null;
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl?: string | null;
  prompt?: string | null;
  modelKey?: string | null;
}): Promise<Creative> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("creatives")
    .insert({
      tenant_id: input.tenantId,
      storyboard_id: input.storyboardId ?? null,
      block_id: input.blockId ?? null,
      media_type: input.mediaType,
      url: input.url,
      thumbnail_url: input.thumbnailUrl ?? null,
      prompt: input.prompt ?? null,
      model_key: input.modelKey ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapCreative(data as CreativeRow);
}

export async function deleteCreative(
  tenantId: string,
  id: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("creatives")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteAllCreatives(tenantId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("creatives")
    .delete()
    .eq("tenant_id", tenantId);
  if (error) throw error;
}
