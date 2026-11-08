export const COMPLETE_VIDEO = {
  imageResolution: "4K",
  videoResolution: "720p",
  takeSeconds: 8,
  takeCount: 2,
} as const;

export type AutoVideoPlan = {
  imagePrompt: string;
  take1: string;
  take2: string;
};

export function parseAutoVideoPlan(raw: string): AutoVideoPlan {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const slice = (fenced ?? raw).trim();
  const start = slice.indexOf("{");
  const end = slice.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("A IA não devolveu os prompts do vídeo.");
  }
  const parsed = JSON.parse(slice.slice(start, end + 1)) as Partial<AutoVideoPlan>;
  const imagePrompt = parsed.imagePrompt?.trim() ?? "";
  const take1 = parsed.take1?.trim() ?? "";
  const take2 = parsed.take2?.trim() ?? "";
  if (!imagePrompt || !take1 || !take2) {
    throw new Error("A IA não completou a imagem e os dois takes.");
  }
  return { imagePrompt, take1, take2 };
}

/** Idioma da fala no vídeo. O pedido do usuário manda; senão, espanhol mexicano. */
export function resolveSpokenLanguage(brief: string) {
  const text = brief.toLowerCase();
  if (
    /\b(english|inglês|ingles|in english|em inglês|em ingles|fala em inglês|speak(?:s|ing)? in english)\b/i.test(
      text
    )
  ) {
    return {
      label: "inglês",
      instruction:
        "A pessoa fala em inglês natural (americano neutro). A fala entre aspas fica em inglês.",
    };
  }
  if (
    /\b(portugu[eê]s|brazilian portuguese|em português|fala em português|pt-br|brasileiro)\b/i.test(
      text
    )
  ) {
    return {
      label: "português brasileiro",
      instruction:
        "A pessoa fala em português brasileiro natural. A fala entre aspas fica em português brasileiro.",
    };
  }
  if (
    /\b(spanish|español|espanhol|mexican spanish|latam spanish|em espanhol|fala em espanhol)\b/i.test(
      text
    )
  ) {
    return {
      label: "espanhol mexicano",
      instruction:
        "A pessoa fala em espanhol mexicano natural. A fala entre aspas fica em espanhol mexicano.",
    };
  }
  return {
    label: "espanhol mexicano",
    instruction:
      "A pessoa fala em espanhol mexicano natural. A fala entre aspas fica em espanhol mexicano. Se o pedido pedir outro idioma, use esse idioma na fala.",
  };
}

export function buildAutoVideoPrompt(brief: string) {
  const spoken = resolveSpokenLanguage(brief);
  return `Você escreve os prompts de UM anúncio em vídeo para o gerador de imagem e o Grok Imagine Video 1.5.

Pedido do usuário:
${brief.trim()}

Idioma da fala: ${spoken.label}.
${spoken.instruction}
Se o pedido pedir um idioma, esse idioma vence qualquer padrão.

Estrutura obrigatória:
- imagePrompt: um único quadro fotográfico realista, a pessoa parada, olhando para a câmera, pronta para falar. Sem texto, sem legenda, sem logotipo inventado. Se houver imagem base, a pessoa, a roupa e o produto saem dela. Não descreva outro produto.
- take1: 8 segundos. Primeira metade da mensagem. Tom natural, gestos pequenos. ${spoken.instruction} A fala cabe em 8 segundos (cerca de 18 a 24 palavras) e vai entre aspas.
- take2: 8 segundos. Continuação, sem repetir a fala do take 1. Fecha o argumento. Mesma pessoa, mesma roupa, mesmo cenário, mesma câmera. Mesmo idioma da fala do take 1.

Os três prompts de direção (câmera, gesto, cena) saem em inglês. Só a fala entre aspas fica no idioma pedido.
Não peça música, legenda nem corte interno.

Responda somente JSON válido, sem markdown:
{
  "imagePrompt": "",
  "take1": "",
  "take2": ""
}`;
}
