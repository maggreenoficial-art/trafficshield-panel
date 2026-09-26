import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getProductDevelopment,
  updateProductDevelopment,
} from "@/lib/db/product-developments";
import { fetchReferencePage } from "@/lib/product-dev/fetch-reference";
import { parseDevPlan } from "@/lib/product-dev/plan";
import { chatGrok46 } from "@/lib/kie/grok-chat";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Produto obrigatório." }, { status: 400 });
    }
    const current = await getProductDevelopment(ctx.tenantId, body.id);
    if (!current) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    if (!current.docs.length && !current.brief.trim()) {
      return NextResponse.json(
        { error: "Envie pelo menos um documento ou escreva o briefing." },
        { status: 400 }
      );
    }

    const pages = [];
    for (const page of current.referencePages.slice(0, 3)) {
      if (!page.url) {
        if (page.text.trim()) pages.push(page);
        continue;
      }
      try {
        pages.push(await fetchReferencePage(page.url));
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Falha na página.";
        pages.push({
          ...page,
          text: page.text || `Não foi possível ler a página: ${msg}`,
        });
      }
    }

    const docs = current.docs
      .slice(0, 3)
      .map(
        (doc) =>
          `DOCUMENTO ${doc.slot} (${doc.name}):\n${doc.text.slice(0, 20000)}`
      )
      .join("\n\n");
    const refs = pages
      .map(
        (page, i) =>
          `PÁGINA DE REFERÊNCIA ${i + 1} (${page.title} — ${page.url}):\n${page.text.slice(0, 8000)}`
      )
      .join("\n\n");

    const prompt = `Você desenvolve produto digital, página de vendas e criativos para Meta Ads no Brasil.

Use SOMENTE a inteligência dos documentos e das páginas de referência. Não invente promessa que não esteja nesses materiais. Se a página de referência existir, a página nova deve seguir a mesma estrutura visual e de seções, com a copy deste produto.

Briefing do operador:
${current.brief || "(sem briefing extra)"}

${docs || "(sem documentos)"}

${refs || "(sem página de referência)"}

Responda SOMENTE JSON válido, sem markdown:
{
  "summary": "parágrafo curto do que o produto é e para quem",
  "copy": {
    "headline": "",
    "subheadline": "",
    "sections": [{"title":"","body":""}],
    "cta": "",
    "emailSubject": "",
    "emailBody": ""
  },
  "pageHtml": "<!doctype html> página completa em português, mobile first, visual próximo das referências, sem script, sem formulário externo",
  "creatives": [
    {
      "kind": "image",
      "title": "nome do criativo",
      "prompt": "prompt de imagem em português, cena pronta para anúncio",
      "takes": []
    },
    {
      "kind": "video",
      "title": "nome do vídeo",
      "prompt": "ideia geral do vídeo",
      "takes": [{"title":"Take 1","prompt":"ação falada e visual deste take","seconds":8}]
    }
  ]
}

No máximo 3 imagens e 2 vídeos. Cada vídeo com no máximo 4 takes de 8 segundos.`;

    const raw = await chatGrok46(prompt);
    const plan = parseDevPlan(raw);
    const development = await updateProductDevelopment(ctx.tenantId, current.id, {
      referencePages: pages,
      plan,
      pageHtml: plan.pageHtml,
      status: current.status === "published" ? "published" : "ready",
    });
    return NextResponse.json({ development });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha no Grok.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
