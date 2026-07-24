import { NextResponse } from "next/server";
import {
  deleteTrafficCampaign,
  getCampaignById,
  getCampaignStats,
  updateTrafficCampaign,
} from "@/lib/db/traffic-campaigns";
import { buildCampaignUrl } from "@/lib/traffic-shield/campaign-engine";
import type { CreateCampaignInput } from "@/lib/traffic-shield/campaign-types";
import { enrichCampaignHostname } from "@/lib/traffic-shield/site-domain";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get("stats") === "1") {
      const stats = await getCampaignStats(id);
      return NextResponse.json(stats);
    }
    const campaign = await getCampaignById(id);
    if (!campaign) {
      return NextResponse.json({ error: "Não encontrada." }, { status: 404 });
    }
    const origin = new URL(request.url).origin;
    const domainHostname = enrichCampaignHostname(campaign, origin);
    const { url, params: urlParams } = buildCampaignUrl(
      origin,
      campaign,
      domainHostname
    );
    return NextResponse.json({
      campaign: { ...campaign, domainHostname },
      campaignUrl: url,
      urlParams,
    });
  } catch {
    return NextResponse.json({ error: "Erro." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<CreateCampaignInput> & {
      status?: "draft" | "active" | "paused";
    };
    const campaign = await updateTrafficCampaign(id, body);
    return NextResponse.json({ campaign });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteTrafficCampaign(id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir." }, { status: 500 });
  }
}
