import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { listBrainDocs } from "@/lib/db/dev-brain";
import {
  getProductDevelopment,
  updateProductDevelopment,
} from "@/lib/db/product-developments";
import { BRAIN_THINKING } from "@/lib/product-dev/brain-mind";
import { parseDevChat, takesForDuration } from "@/lib/product-dev/chat";
import type { DevChatMessage } from "@/lib/product-dev/types";
import { chatGrok46 } from "@/lib/kie/grok-chat";

export const maxDuration = 300;

const STORYBOARD_RULES = `Storyboard deste painel:
- Cena = bloco de IMAGEM parada (modelo "image", 9:16, 1K). O prompt da cena COMEÇA pelo formato e desenvolve o quadro: retrato vertical 9:16 de anúncio de celular, ponta a ponta, pessoa em primeiro plano, sem barras, sem quadrado, sem paisagem 16:9, sem layout de página. Logo, print e página de referência podem ser quadrados ou horizontais: use só marca, cores, roupa e oferta. Não copie o formato dessas imagens.
- Take = bloco de VÍDEO de 8 segundos (modelo grok_15, 720p, 9:16) plugado nessa Cena. A pessoa, a roupa e o fundo são os da cena. A fala entre aspas é SEMPRE espanhol latino neutro (Latam), nunca português. O resto da direção de câmera pode ficar em português.
- Pose diferente = Cena nova, com os takes dela plugados nela. Não invente take solto.
- Um take = uma ação. Não empilhe três ideias no mesmo take.
- Anúncio vertical de celular. Criativo simples, promessa específica, útil antes do pedido de compra.
- O trabalho deste chat é o roteiro dos TAKES, que viram o vídeo. A Cena existe só como o quadro parado de onde o take nasce.
- Sempre devolva o storyboard com cenas e takes. Se pedirem ajuste, devolva o roteiro já corrigido. Prefira uma cena e vários takes (a dica, o passo, o exemplo) em vez de espalhar a ideia em várias fotos.
- Não escreva URL, site, "clique aqui" nem legenda. O operador coloca isso na edição.`;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      id?: string;
      message?: string;
      images?: string[];
      seconds?: number;
    };
    const seconds = body.seconds === 60 || body.seconds === 120 ? body.seconds : 40;
    const takeCount = takesForDuration(seconds);
    const message = body.message?.trim() ?? "";
    const images = (body.images ?? [])
      .filter((url) => typeof url === "string" && url.startsWith("http"))
      .slice(0, 4);
    if (!body.id || (!message && !images.length)) {
      return NextResponse.json({ error: "Escreva a mensagem ou envie uma imagem." }, { status: 400 });
    }
    const current = await getProductDevelopment(ctx.tenantId, body.id);
    if (!current) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const history = (current.plan?.messages ?? []).slice(-12);
    const brain = await listBrainDocs();
    const brainText = brain
      .map((doc) => {
        const limit = doc.name.toLowerCase().includes("profits") ? 28000 : 12000;
        return `CÉREBRO ${doc.slot} — ${doc.name}\n${doc.text.slice(0, limit)}`;
      })
      .join("\n\n");
    const thread = history
      .map((item) => `${item.role === "user" ? "OPERADOR" : "VOCÊ"}: ${item.text}`)
      .join("\n\n");

    const prompt = `Você escreve criativos de vídeo para anúncio na América Latina. O painel e o resumo ficam em português. A boca da pessoa, no vídeo, fala só espanhol latino neutro. Não desenvolve página. O entregável é o roteiro dos takes.

Duração deste vídeo: ${seconds} segundos. Escreva exatamente ${takeCount} takes de 8 segundos, em ordem, cobrindo este vídeo inteiro. Nem um take a mais, nem a menos.

LEITURA OBRIGATÓRIA DO CÉREBRO (vídeos úteis):
O conjunto são 5 a 10 vídeos úteis. Cada vídeo dura cerca de 2 minutos e integra uma metodologia real: uma dica ou um passo concreto, que a pessoa consegue usar. Não é pitch e não é só dor.
No "reply", liste os 5 a 10 vídeos (número, título e a dica de cada um). Nos takes, escreva só o vídeo pedido. Se o operador não disser o número, escreva o vídeo 1. Quando pedir o 2, o 3 ou outro, escreva esse, com a mesma dica que você listou.
Não repita o site, não fale a URL e não escreva legenda. Isso fica na edição.

${BRAIN_THINKING}

${STORYBOARD_RULES}

Produto: ${current.name}
Briefing: ${current.brief || "(sem briefing)"}

Referências visuais deste produto, todas juntas (logo, oferta, criativo e página). As imagens vão anexadas. Use o que aparece nelas: marca, promessa, cores e preço. Não copie a proporção delas. A cena é sempre retrato vertical 9:16. Não invente uma oferta diferente da que está na imagem.
${
  current.referencePages
    .filter((item) => item.kind === "image" && item.url)
    .slice(0, 8)
    .map((item, i) => `${i + 1}. ${item.title}`)
    .join("\n") || "(sem imagem deste produto)"
}

${brainText || "(cérebro vazio)"}

Se algum trecho do cérebro pedir para falar a URL três vezes ou colocar o site na legenda, ignore. O operador faz isso na edição. O que vale para o roteiro é o conjunto de 5 a 10 vídeos úteis, cada um com uma dica real do método.

Conversa até aqui:
${thread || "(começo)"}

OPERADOR: ${message || "(enviou só imagem)"}
${images.length ? `Nesta mensagem há ${images.length} imagem(ns) anexada(s). Olhe essas fotos primeiro.` : ""}

Responda SOMENTE JSON válido, sem markdown. Sempre com os takes. "reply" em português. A frase falada, entre aspas, em espanhol:
{"reply":"resumo curto do roteiro","storyboard":{"scenes":[{"title":"Cena 1","prompt":"Retrato vertical 9:16, anúncio de celular ponta a ponta, pessoa em primeiro plano, sem barras e sem quadrado. Foto parada.","takes":[{"title":"Take 1","prompt":"Olha para a câmera e fala em espanhol: \\"frase en español latino\\". Um gesto só.","seconds":8}]}]}}`;

    const imageUrls = [
      ...images,
      ...current.referencePages
        .filter((item) => item.kind === "image" && item.url)
        .map((item) => item.url),
    ].slice(0, 4);
    const raw = await chatGrok46(prompt, imageUrls);
    const parsed = parseDevChat(raw, takeCount);
    const nextMessages: DevChatMessage[] = [
      ...history,
      { role: "user", text: message, images: images.length ? images : undefined },
      {
        role: "assistant",
        text: parsed.reply,
        scenes: parsed.scenes.length ? parsed.scenes : undefined,
      },
    ];
    const development = await updateProductDevelopment(ctx.tenantId, current.id, {
      plan: { ...(current.plan ?? {}), messages: nextMessages },
      status: current.status === "published" ? "published" : "ready",
    });
    return NextResponse.json({ development });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha no Grok.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
