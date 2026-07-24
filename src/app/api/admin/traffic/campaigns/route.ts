import { NextResponse } from "next/server";
import {
  createTrafficCampaign,
  getCampaignStats,
  getTrafficCampaigns,
  getTrafficDomainsWithStats,
} from "@/lib/db/traffic-campaigns";
import type { CreateCampaignInput } from "@/lib/traffic-shield/campaign-types";
import {
  enrichCampaignHostname,
  getSiteCampaignHostname,
} from "@/lib/traffic-shield/site-domain";

export async function GET(request: Request) {
  try {
    const origin = new URL(request.url).origin;
    const { searchParams } = new URL(request.url);
    const statsFor = searchParams.get("stats");
    if (statsFor) {
      const stats = await getCampaignStats(statsFor);
      return NextResponse.json(stats);
    }
    const campaigns = (await getTrafficCampaigns()).map((campaign) => ({
      ...campaign,
      domainHostname: enrichCampaignHostname(campaign, origin),
    }));
    return NextResponse.json({ campaigns });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar campanhas." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateCampaignInput;
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
    }
    const origin = new URL(request.url).origin;

    if (body.useSiteDomain) {
      const siteHostname = getSiteCampaignHostname(origin);
      if (!siteHostname) {
        return NextResponse.json(
          {
            error:
              "Domínio da loja não configurado. Defina NEXT_PUBLIC_SITE_URL ou acesse o painel pelo domínio da loja.",
          },
          { status: 400 }
        );
      }
      body.domainId = undefined;
    } else if (!body.domainId) {
      return NextResponse.json(
        { error: "Selecione o domínio da loja ou um domínio de campanha validado." },
        { status: 400 }
      );
    } else {
      const domains = await getTrafficDomainsWithStats();
      const domain = domains.find((d) => d.id === body.domainId);
      if (!domain) {
        return NextResponse.json(
          { error: "Domínio não encontrado." },
          { status: 400 }
        );
      }
      if (domain.status !== "valid") {
        return NextResponse.json(
          {
            error:
              "O domínio de campanha precisa estar validado (CNAME) antes de usar.",
          },
          { status: 400 }
        );
      }
    }

    if (!body.safePageUrl || !body.offerPageUrl) {
      return NextResponse.json(
        { error: "Páginas segura e de oferta são obrigatórias." },
        { status: 400 }
      );
    }

    const campaign = await createTrafficCampaign(body, origin);
    return NextResponse.json({
      campaign: {
        ...campaign,
        campaignUrl: campaign.campaignUrl,
        urlParams: campaign.urlParams,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro ao criar campanha.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
