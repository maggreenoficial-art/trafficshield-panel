import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getCampaignAnalysis,
  listCampaignAnalyses,
  patchCampaignAnalysisResult,
  saveCampaignAnalysis,
} from "@/lib/db/campaign-analyses";
import type { AdsEngagementRow } from "@/lib/ads-analysis/parse-ads-export";
import type { TripleEngagementAnalysis } from "@/lib/ads-analysis/analyze-engagement";

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const id = new URL(request.url).searchParams.get("id");
    if (id) {
      const analysis = await getCampaignAnalysis(ctx.tenantId, id);
      if (!analysis) {
        return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
      }
      return NextResponse.json({ analysis });
    }
    const analyses = await listCampaignAnalyses(ctx.tenantId);
    return NextResponse.json({ analyses });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar análises. Rode supabase/patch-campaign-analysis.sql." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      title?: string;
      campaignFileName?: string;
      adsetFileName?: string;
      adFileName?: string;
      campaignRows?: AdsEngagementRow[];
      adsetRows?: AdsEngagementRow[];
      adRows?: AdsEngagementRow[];
      result?: TripleEngagementAnalysis;
    };
    if (!body.result || !body.campaignRows || !body.adsetRows || !body.adRows) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }
    const analysis = await saveCampaignAnalysis(ctx.tenantId, ctx.userId, {
      title: body.title,
      campaignFileName: body.campaignFileName || "",
      adsetFileName: body.adsetFileName || "",
      adFileName: body.adFileName || "",
      campaignRows: body.campaignRows,
      adsetRows: body.adsetRows,
      adRows: body.adRows,
      result: body.result,
    });
    return NextResponse.json({ analysis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao salvar.";
    return NextResponse.json(
      {
        error: msg.includes("campaign_analyses")
          ? "Tabela não existe. Rode supabase/patch-campaign-analysis.sql no Supabase."
          : msg,
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      id?: string;
      result?: TripleEngagementAnalysis;
    };
    if (!body.id || !body.result) {
      return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
    }
    const existing = await getCampaignAnalysis(ctx.tenantId, body.id);
    if (!existing) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    await patchCampaignAnalysisResult(ctx.tenantId, body.id, body.result);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro ao atualizar.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
