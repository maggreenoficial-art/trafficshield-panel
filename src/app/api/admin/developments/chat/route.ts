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
- Uma única Cena: a ATRIZ. Retrato vertical 9:16, rosto nítido, mesma roupa, sem ebook, sem prato e sem embalagem. Essa foto é a identidade dela. Não crie uma cena nova para cada ângulo.
- Todos os takes nascem dessa mesma atriz. Muda o ângulo, o gesto e a ação. O rosto, o cabelo e a roupa não mudam.
- Cada take tem dois textos. "image" é a orientação da FOTO parada que será gerada para esse take: ângulo, enquadramento e o que está no quadro, sem fala. "prompt" é o VÍDEO: o movimento desses 8 segundos e a fala entre aspas, sempre em espanhol latino neutro.
- A imagem do produto (ebook, prato, página) NÃO é a atriz. showProduct true só no take em que o produto entra no quadro, em geral a leitura do começo e a oferta do final. Nos outros takes, showProduct false e o produto não aparece.
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

    const ebookTexts = current.referencePages.filter(
      (item) => item.kind === "text" && item.text.trim()
    );
    const hostedImages = current.referencePages.filter(
      (item) => item.kind === "image" && item.url.startsWith("http")
    );
    const ebookSource = ebookTexts.length
      ? `PDF DESTE PRODUTO. Diga qual arquivo você usou e escolha UMA receita escrita nele. Use o nome, os ingredientes e as quantidades. Não invente receita vaga.
${ebookTexts
  .slice(0, 2)
  .map((item) => `${item.title}\n${item.text.slice(0, 8000)}`)
  .join("\n\n")}`
      : "Sem PDF. Use a receita que estiver nas referências do produto, com ingredientes concretos.";
    const ebookBlock = `${ebookSource}

IMAGENS JÁ HOSPEDADAS (não crie capa nova):
${
  hostedImages.length
    ? hostedImages
        .slice(0, 8)
        .map((item, i) => `${i + 1}. ${item.title}`)
        .join("\n")
    : "(nenhuma imagem hospedada)"
}
Essas fotos são o PRODUTO, não a atriz. A primeira imagem do storyboard é a atriz, gerada uma vez, e ela se mantém em todos os takes. O produto só entra no take em que aparece (leitura e oferta final).

FORMATO DESTE VÍDEO (engajamento, tutorial de graça):
Uma cena só: a atriz. A soma dos takes é a duração pedida.
1) Primeiro take, showProduct true: ela lê a receita no ebook (celular, iPad ou livro). Sem oferta.
2) Takes do meio, showProduct false: a mesma atriz ensina a receita. Só muda o ângulo. Sem ebook e sem oferta.
3) Último take, showProduct true: mostra o ebook e convida, em espanhol, a comentar QUIERO. Sem URL e sem legenda.`;

    const prompt = `Você escreve criativos de vídeo para anúncio na América Latina. O painel e o resumo ficam em português. A boca da pessoa, no vídeo, fala só espanhol latino neutro. Não desenvolve página. O entregável é o roteiro dos takes.

Duração deste vídeo: ${seconds} segundos. Escreva exatamente ${takeCount} takes de 8 segundos, em ordem, cobrindo este vídeo inteiro. Nem um take a mais, nem a menos.

LEITURA OBRIGATÓRIA DO CÉREBRO (vídeos úteis de engajamento):
O conjunto são 5 a 10 tutoriais. Cada um é um vídeo gratuito de como fazer uma receita do produto, com qualidade, não um anúncio. A pessoa usa de graça o que aprende. A oferta só no último take.
No "reply", liste os 5 a 10 (número, título e a receita de cada um). Nos takes, escreva só o vídeo pedido. Se o operador não disser o número, escreva o vídeo 1.
Não fale URL e não escreva legenda. O CTA do final é falado: em espanhol, pedir que comentem QUIERO para receber mais receitas.

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

${ebookBlock}

${brainText || "(cérebro vazio)"}

Se algum trecho do cérebro pedir para falar a URL três vezes ou colocar o site na legenda, ignore. O operador faz isso na edição. O que vale para o roteiro é o conjunto de 5 a 10 vídeos úteis, cada um com uma dica real do método.

Conversa até aqui:
${thread || "(começo)"}

OPERADOR: ${message || "(enviou só imagem)"}
${images.length ? `Nesta mensagem há ${images.length} imagem(ns) anexada(s). Olhe essas fotos primeiro.` : ""}

Responda SOMENTE JSON válido, sem markdown. Sempre com os takes. "reply" em português. A frase falada, entre aspas, em espanhol:
{"reply":"resumo curto do roteiro","storyboard":{"scenes":[{"title":"Atriz","prompt":"Mulher, rosto nítido, mesma roupa, cozinha simples, sem ebook e sem prato.","takes":[{"title":"Take 1","image":"Mesma atriz, plano médio frontal, ebook aberto na mão, cozinha ao fundo.","prompt":"Ela olha o ebook e lê em espanhol: frase da receita.","seconds":8,"showProduct":true},{"title":"Take 2","image":"Mesma atriz, ângulo de três quartos, mãos na panela, sem ebook.","prompt":"Ela mexe a panela e fala em espanhol: o passo da receita.","seconds":8,"showProduct":false}]}]}}`;

    const imageUrls = [
      ...images,
      ...hostedImages.map((item) => item.url),
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
