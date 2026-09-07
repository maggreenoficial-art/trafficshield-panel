import { NextResponse, type NextRequest } from "next/server";
import {
  deleteTrafficCampaign,
  getCampaignById,
  getCampaignStats,
  rotateCampaignToken,
  updateTrafficCampaign,
} from "@/lib/db/traffic-campaigns";
import { buildCampaignUrl, buildConversionPostbackUrl } from "@/lib/traffic-shield/campaign-engine";
import type { CreateCampaignInput } from "@/lib/traffic-shield/campaign-types";
import { enrichCampaignHostname } from "@/lib/traffic-shield/site-domain";
import { requirePanelContext } from "@/lib/api/panel-context";
import { invalidateCampaignCache } from "@/lib/traffic-shield/campaign-middleware";
import { getSiteUrl } from "@/lib/site-config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    if (searchParams.get("stats") === "1") {
      const stats = await getCampaignStats(ctx.tenantId, id);
      const campaign = await getCampaignById(id, ctx.tenantId);
      const siteOrigin = getSiteUrl();
      const postbackBaseUrl =
        campaign && campaign.uniqueToken
          ? buildConversionPostbackUrl({
              origin: siteOrigin,
              slug: campaign.slug,
              token: campaign.uniqueToken,
              event: "purchase",
            })
          : undefined;
      return NextResponse.json({ ...stats, postbackBaseUrl });
    }
    const campaign = await getCampaignById(id, ctx.tenantId);
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
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    const body = (await request.json()) as Partial<CreateCampaignInput> & {
      status?: "draft" | "active" | "paused";
      action?: string;
    };

    if (body.action === "rotate_token") {
      const campaign = await rotateCampaignToken(ctx.tenantId, id);
      invalidateCampaignCache();
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
        message:
          "Token regenerado. Atualize o link no anúncio — o anterior deixa de liberar a oferta.",
      });
    }

    const campaign = await updateTrafficCampaign(ctx.tenantId, id, body);
    invalidateCampaignCache();
    return NextResponse.json({ campaign });
  } catch {
    return NextResponse.json({ error: "Erro ao atualizar." }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { id } = await params;
    await deleteTrafficCampaign(ctx.tenantId, id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao excluir." }, { status: 500 });
  }
}
