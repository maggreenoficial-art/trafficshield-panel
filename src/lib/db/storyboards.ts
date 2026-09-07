import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export type Storyboard = {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
  sceneCount?: number;
};

export type StoryboardBlock = {
  id: string;
  tenantId: string;
  storyboardId: string;
  modelKey: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  referenceUrls: string[];
  positionX: number;
  positionY: number;
  status: "draft" | "queued" | "generating" | "success" | "fail";
  resultUrl: string | null;
  resultUrls: string[];
  kieTaskId: string | null;
  kieModel: string | null;
  creditsCharged: number;
  errorMessage: string | null;
  sourceBlockId: string | null;
  createdAt: string;
  updatedAt: string;
};

type BoardRow = {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  cover_url: string | null;
  created_at: string;
  updated_at: string;
};

type BlockRow = {
  id: string;
  tenant_id: string;
  storyboard_id: string;
  model_key: string;
  prompt: string;
  aspect_ratio: string;
  resolution: string;
  reference_urls: unknown;
  position_x: number;
  position_y: number;
  status: StoryboardBlock["status"];
  result_url: string | null;
  result_urls: unknown;
  kie_task_id: string | null;
  kie_model: string | null;
  credits_charged: number;
  error_message: string | null;
  source_block_id?: string | null;
  created_at: string;
  updated_at: string;
};

function mapBoard(row: BoardRow, sceneCount?: number): Storyboard {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    coverUrl: row.cover_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sceneCount,
  };
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function mapBlock(row: BlockRow): StoryboardBlock {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    storyboardId: row.storyboard_id,
    modelKey: row.model_key,
    prompt: row.prompt,
    aspectRatio: row.aspect_ratio,
    resolution: row.resolution,
    referenceUrls: asStringArray(row.reference_urls),
    positionX: row.position_x,
    positionY: row.position_y,
    status: row.status,
    resultUrl: row.result_url,
    resultUrls: asStringArray(row.result_urls),
    kieTaskId: row.kie_task_id,
    kieModel: row.kie_model,
    creditsCharged: Number(row.credits_charged) || 0,
    errorMessage: row.error_message,
    sourceBlockId: row.source_block_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listStoryboards(tenantId: string): Promise<Storyboard[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("storyboards")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  const boards = (data as BoardRow[]) ?? [];

  const counts = await Promise.all(
    boards.map(async (b) => {
      const { count } = await supabase
        .from("storyboard_blocks")
        .select("id", { count: "exact", head: true })
        .eq("storyboard_id", b.id);
      return count ?? 0;
    })
  );

  return boards.map((b, i) => mapBoard(b, counts[i]));
}

export async function getStoryboard(
  tenantId: string,
  id: string
): Promise<Storyboard | null> {
  if (!hasAdminClient()) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("storyboards")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBoard(data as BoardRow) : null;
}

export async function createStoryboard(
  tenantId: string,
  input: { name: string; description?: string }
): Promise<Storyboard> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("storyboards")
    .insert({
      tenant_id: tenantId,
      name: input.name.trim(),
      description:
        input.description?.trim() ||
        "Organize suas ideias e comece uma nova produção",
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapBoard(data as BoardRow, 0);
}

export async function deleteStoryboard(
  tenantId: string,
  id: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("storyboards")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw error;
}

export async function touchStoryboard(
  tenantId: string,
  id: string,
  coverUrl?: string | null
): Promise<void> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (coverUrl !== undefined) patch.cover_url = coverUrl;
  await supabase
    .from("storyboards")
    .update(patch)
    .eq("tenant_id", tenantId)
    .eq("id", id);
}

export async function listBlocks(
  tenantId: string,
  storyboardId: string
): Promise<StoryboardBlock[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("storyboard_blocks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("storyboard_id", storyboardId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data as BlockRow[]) ?? []).map(mapBlock);
}

export async function getBlockById(
  tenantId: string,
  id: string
): Promise<StoryboardBlock | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("storyboard_blocks")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBlock(data as BlockRow) : null;
}

export async function getBlockByKieTaskId(
  taskId: string
): Promise<StoryboardBlock | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("storyboard_blocks")
    .select("*")
    .eq("kie_task_id", taskId)
    .maybeSingle();
  if (error) throw error;
  return data ? mapBlock(data as BlockRow) : null;
}

export async function createBlock(
  tenantId: string,
  input: {
    storyboardId: string;
    modelKey: string;
    prompt?: string;
    aspectRatio?: string;
    resolution?: string;
    referenceUrls?: string[];
    positionX: number;
    positionY: number;
    status?: StoryboardBlock["status"];
    creditsCharged?: number;
    kieModel?: string;
    sourceBlockId?: string | null;
  }
): Promise<StoryboardBlock> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("storyboard_blocks")
    .insert({
      tenant_id: tenantId,
      storyboard_id: input.storyboardId,
      model_key: input.modelKey,
      prompt: input.prompt ?? "",
      aspect_ratio: input.aspectRatio ?? "auto",
      resolution: input.resolution ?? "1K",
      reference_urls: input.referenceUrls ?? [],
      position_x: input.positionX,
      position_y: input.positionY,
      status: input.status ?? "draft",
      credits_charged: input.creditsCharged ?? 0,
      kie_model: input.kieModel ?? null,
      source_block_id: input.sourceBlockId ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return mapBlock(data as BlockRow);
}

export async function updateBlock(
  tenantId: string,
  id: string,
  patch: Partial<{
    status: StoryboardBlock["status"];
    resultUrl: string | null;
    resultUrls: string[];
    kieTaskId: string | null;
    kieModel: string | null;
    errorMessage: string | null;
    positionX: number;
    positionY: number;
    prompt: string;
    modelKey: string;
    aspectRatio: string;
    resolution: string;
    referenceUrls: string[];
    creditsCharged: number;
    sourceBlockId: string | null;
  }>
): Promise<StoryboardBlock> {
  const supabase = createAdminClient();
  const row: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.status !== undefined) row.status = patch.status;
  if (patch.resultUrl !== undefined) row.result_url = patch.resultUrl;
  if (patch.resultUrls !== undefined) row.result_urls = patch.resultUrls;
  if (patch.kieTaskId !== undefined) row.kie_task_id = patch.kieTaskId;
  if (patch.kieModel !== undefined) row.kie_model = patch.kieModel;
  if (patch.errorMessage !== undefined) row.error_message = patch.errorMessage;
  if (patch.positionX !== undefined) row.position_x = patch.positionX;
  if (patch.positionY !== undefined) row.position_y = patch.positionY;
  if (patch.prompt !== undefined) row.prompt = patch.prompt;
  if (patch.modelKey !== undefined) row.model_key = patch.modelKey;
  if (patch.aspectRatio !== undefined) row.aspect_ratio = patch.aspectRatio;
  if (patch.resolution !== undefined) row.resolution = patch.resolution;
  if (patch.referenceUrls !== undefined) row.reference_urls = patch.referenceUrls;
  if (patch.creditsCharged !== undefined) row.credits_charged = patch.creditsCharged;
  if (patch.sourceBlockId !== undefined) row.source_block_id = patch.sourceBlockId;

  const { data, error } = await supabase
    .from("storyboard_blocks")
    .update(row)
    .eq("tenant_id", tenantId)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return mapBlock(data as BlockRow);
}

export async function deleteBlock(
  tenantId: string,
  id: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("storyboard_blocks")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("id", id);
  if (error) throw error;
}
