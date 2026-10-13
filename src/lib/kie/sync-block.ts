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
import { isArtLayerPrompt } from "@/lib/news/feed-title";
import { publishNewsComposite } from "@/lib/news/overlay";

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
    let url = info.resultUrls[0] ?? null;
    if (url && isArtLayerPrompt(block.prompt)) {
      try {
        url = await publishNewsComposite({
          tenantId: block.tenantId,
          blockId: block.id,
          artUrl: url,
          photoUrl: block.referenceUrls[2] ?? "",
        });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Não foi possível colar a arte sobre a foto original.";
        return updateBlock(block.tenantId, block.id, {
          status: "fail",
          errorMessage: message.slice(0, 240),
        });
      }
    }
    const updated = await updateBlock(block.tenantId, block.id, {
      status: "success",
      resultUrl: url,
      resultUrls: info.resultUrls,
      errorMessage: null,
      creditsCharged:
        info.creditsConsumed != null
          ? Number(info.creditsConsumed)
          : block.creditsCharged,
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
    return updateBlock(block.tenantId, block.id, {
      status: "fail",
      errorMessage: info.failMsg || "Geração falhou na Kie AI.",
    });
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
