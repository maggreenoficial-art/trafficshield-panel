import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import type { AnalyzedAd } from "@/lib/ads-analysis/analyze-engagement";
import {
  compactAdsForGrok,
  parseGrokRankingJson,
} from "@/lib/ads-analysis/rank-creatives";
import { getCampaignAnalysis, patchCampaignAnalysisResult } from "@/lib/db/campaign-analyses";
import { chatGrok46 } from "@/lib/kie/grok-chat";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      ads?: AnalyzedAd[];
      analysisId?: string;
    };
    if (!body.ads?.length) {
      return NextResponse.json({ error: "Sem anúncios para analisar." }, { status: 400 });
    }

    const compact = compactAdsForGrok(body.ads, 40);
    const prompt = `Você é um media buyer sênior de Meta Ads no Brasil (política / engajamento).

Analise os criativos abaixo. Métricas: er = engagement rate % no post, cpe = custo por engajamento, hold50/hold75 = retenção de vídeo %.
Separe Jair Bolsonaro de Flávio Bolsonaro. Considere também temas evangélicos, mulheres e bio quando aparecerem.

Regras:
- Use o campo "name" EXATAMENTE como está na lista (é o nome do anúncio no Gerenciador).
- Ranking próprio: não copie o algoRank. Pode discordar do algoritmo.
- Priorize criativos que prendem (ER alto, comentário/save/share, retenção) e CPE razoável. Penalize fadiga (frequency alta + ER baixo) e gasto alto em criativo fraco.
- Devolva SOMENTE JSON válido, sem markdown:

{
  "opinion": "2 a 5 parágrafos em português: o que está funcionando, o que pausar, e o que escalar. Seja direto.",
  "ranking": [
    { "rank": 1, "name": "NOME_EXATO_DO_ANUNCIO", "reason": "1 frase" }
  ]
}

Liste no máximo 15 criativos no ranking, do melhor para o pior entre os bons. Não invente nomes.

Dados:
${JSON.stringify(compact)}`;

    const raw = await chatGrok46(prompt);
    const grok = parseGrokRankingJson(raw);

    if (body.analysisId) {
      const saved = await getCampaignAnalysis(ctx.tenantId, body.analysisId);
      if (saved) {
        await patchCampaignAnalysisResult(ctx.tenantId, body.analysisId, {
          ...saved.result,
          grok,
        });
      }
    }

    return NextResponse.json({ grok });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Falha no Grok.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
