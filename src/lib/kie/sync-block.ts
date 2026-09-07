import { creditCredits } from "@/lib/db/credits";
import { insertCreative } from "@/lib/db/creatives";
import {
  getBlockById,
  getBlockByKieTaskId,
  touchStoryboard,
  updateBlock,
  type StoryboardBlock,
} from "@/lib/db/storyboards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getKieTaskInfo } from "@/lib/kie/client";
import { getStoryboardModel } from "@/lib/kie/models";

async function creativeExistsForBlock(blockId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { count } = await supabase
    .from("creatives")
    .select("id", { count: "exact", head: true })
    .eq("block_id", blockId);
  return (count ?? 0) > 0;
}

export async function syncBlockFromKie(
  block: StoryboardBlock
): Promise<StoryboardBlock> {
  if (!block.kieTaskId) return block;
  if (block.status === "success" || block.status === "fail") return block;

  const info = await getKieTaskInfo(block.kieTaskId);

  if (info.state === "success") {
    const url = info.resultUrls[0] ?? null;
    const updated = await updateBlock(block.tenantId, block.id, {
      status: "success",
      resultUrl: url,
      resultUrls: info.resultUrls,
      errorMessage: null,
    });

    if (url && !(await creativeExistsForBlock(block.id))) {
      const model = getStoryboardModel(block.modelKey);
      await insertCreative({
        tenantId: block.tenantId,
        storyboardId: block.storyboardId,
        blockId: block.id,
        mediaType: model?.kind ?? "image",
        url,
        thumbnailUrl: model?.kind === "image" ? url : null,
        prompt: block.prompt,
        modelKey: block.modelKey,
      });
      await touchStoryboard(block.tenantId, block.storyboardId, url);
    }

    return updated;
  }

  if (info.state === "fail") {
    const updated = await updateBlock(block.tenantId, block.id, {
      status: "fail",
      errorMessage: info.failMsg || "Geração falhou na Kie AI.",
    });
    if (block.creditsCharged > 0) {
      await creditCredits({
        tenantId: block.tenantId,
        amount: block.creditsCharged,
        reason: "reembolso_geracao_falhou",
        refType: "storyboard_block",
        refId: block.id,
      });
    }
    return updated;
  }

  if (info.state === "generating" || info.state === "queuing") {
    return updateBlock(block.tenantId, block.id, { status: "generating" });
  }

  return block;
}

export async function syncBlockById(tenantId: string, blockId: string) {
  const block = await getBlockById(tenantId, blockId);
  if (!block) return null;
  return syncBlockFromKie(block);
}

export async function syncBlockByTaskId(taskId: string) {
  const block = await getBlockByKieTaskId(taskId);
  if (!block) return null;
  return syncBlockFromKie(block);
}
