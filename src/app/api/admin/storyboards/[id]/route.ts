import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { getTenantCredits } from "@/lib/db/credits";
import {
  deleteStoryboard,
  getStoryboard,
  listBlocks,
} from "@/lib/db/storyboards";
import { syncBlockFromKie } from "@/lib/kie/sync-block";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: Ctx) {
  const panel = await requirePanelContext(request);
  if (panel instanceof NextResponse) return panel;

  const { id } = await context.params;

  try {
    const storyboard = await getStoryboard(panel.tenantId, id);
    if (!storyboard) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    let blocks = await listBlocks(panel.tenantId, id);
    blocks = await Promise.all(
      blocks.map(async (b) => {
        if (
          b.kieTaskId &&
          (b.status === "queued" || b.status === "generating")
        ) {
          try {
            return await syncBlockFromKie(b);
          } catch {
            return b;
          }
        }
        return b;
      })
    );

    const credits = await getTenantCredits(panel.tenantId);
    return NextResponse.json({ storyboard, blocks, credits });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar storyboard." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, context: Ctx) {
  const panel = await requirePanelContext(request);
  if (panel instanceof NextResponse) return panel;
  const { id } = await context.params;

  try {
    const existing = await getStoryboard(panel.tenantId, id);
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    await deleteStoryboard(panel.tenantId, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Erro ao excluir storyboard." },
      { status: 500 }
    );
  }
}
