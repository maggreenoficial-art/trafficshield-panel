import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getProductDevelopment,
  updateProductDevelopment,
} from "@/lib/db/product-developments";
import { fetchReferencePage } from "@/lib/product-dev/fetch-reference";
import { parseDevPlan } from "@/lib/product-dev/plan";
import { listBrainDocs } from "@/lib/db/dev-brain";
import { BRAIN_THINKING } from "@/lib/product-dev/brain-mind";
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
    const brain = await listBrainDocs();
    if (!brain.length && !current.brief.trim() && !current.referencePages.length) {
      return NextResponse.json(
        { error: "Suba o cérebro ou escreva o briefing do produto." },
        { status: 400 }
      );
    }

    const pages = [];
    for (const page of current.referencePages.slice(0, 8)) {
      if (page.kind === "site" && page.url) {
        try {
          const fetched = await fetchReferencePage(page.url);
          pages.push({ ...page, ...fetched, kind: "site" as const });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Falha na página.";
          pages.push({
            ...page,
            text: page.text || `Não foi possível ler o site: ${msg}`,
          });
        }
        continue;
      }
      pages.push(page);
    }

    const brainText = brain
      .map((doc) => {
        const limit = doc.name.toLowerCase().includes("profits") ? 48000 : 20000;
        return `CÉREBRO ${doc.slot} — ${doc.name}\n${doc.text.slice(0, limit)}`;
      })
      .join("\n\n");

    const refs = pages
      .map((page, i) => {
        const kind = page.kind ?? "site";
        const body =
          kind === "image" || kind === "video"
            ? `${page.url}\n${page.text}`.trim()
            : page.text || page.url;
        return `REFERÊNCIA ${i + 1} (${kind}) ${page.title}\n${body.slice(0, 8000)}`;
      })
      .join("\n\n");

    const imageUrls = pages
      .filter((page) => page.kind === "image" && page.url)
      .map((page) => page.url)
      .slice(0, 4);

    const prompt = `Você desenvolve produto digital, página de vendas e criativos para Meta Ads no Brasil.

${BRAIN_THINKING}

Os documentos do cérebro mandam no raciocínio. As referências deste produto (imagem, vídeo, texto, site) são o material da vez. Não invente promessa que não esteja no briefing ou nas referências. Se houver página de site, a página nova segue a estrutura dela com a copy deste produto.

Briefing do operador:
${current.brief || "(sem briefing extra)"}

${brainText || "(cérebro ainda vazio)"}

${refs || "(sem referência deste produto)"}

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

    const raw = await chatGrok46(prompt, imageUrls);
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
