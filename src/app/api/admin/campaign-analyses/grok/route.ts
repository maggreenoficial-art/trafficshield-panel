import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import type { AnalyzedAd } from "@/lib/ads-analysis/analyze-engagement";
import {
  compactAdsForGrok,
  parseGrokRankingJson,
} from "@/lib/ads-analysis/rank-creatives";
import {
  getCampaignAnalysis,
  patchCampaignAnalysisResult,
} from "@/lib/db/campaign-analyses";
import { chatGrok46 } from "@/lib/kie/grok-chat";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      ads?: AnalyzedAd[];
      analysisId?: string;
    };

    let ads = body.ads ?? [];
    let saved =
      body.analysisId
        ? await getCampaignAnalysis(ctx.tenantId, body.analysisId)
        : null;
    if (saved?.result?.ad?.ads?.length) {
      ads = saved.result.ad.ads;
    }
    if (!ads.length) {
      return NextResponse.json({ error: "Sem anúncios para analisar." }, { status: 400 });
    }

    const compact = compactAdsForGrok(ads, 25);
    const prompt = `Você é um media buyer sênior de Meta Ads no Brasil (política / engajamento).

O critério principal é HYPE DE VOLUME, não taxa.
Quem mais hypou = mais reações + comentários + shares + saves no total (criativo somado em todos os conjuntos).
NÃO coloque no topo criativo com ER alto e pouco volume (exemplo: ~165 reações). Isso não hypou.

Separe Jair de Flávio. Considere evangélicos, mulheres e bio.
Use o campo name EXATAMENTE como na lista. Ranking próprio.

Responda SOMENTE JSON válido, sem markdown:
{"opinion":"2 a 4 parágrafos em português: quem explodiu, quem é volume baixo disfarçado de ER, o que escalar","ranking":[{"rank":1,"name":"NOME_EXATO","reason":"1 frase com volume"}]}

No máximo 12 criativos. Não invente nomes.

Dados:
${JSON.stringify(compact)}`;

    const raw = await chatGrok46(prompt);
    let grok;
    try {
      grok = parseGrokRankingJson(raw);
    } catch {
      grok = { opinion: raw.trim(), ranking: [] };
    }

    if (saved) {
      await patchCampaignAnalysisResult(ctx.tenantId, saved.id, {
        ...saved.result,
        grok,
      });
    }

    return NextResponse.json({ grok });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no Grok.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
