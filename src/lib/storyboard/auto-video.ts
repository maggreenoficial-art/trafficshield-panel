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

export function buildAutoVideoPrompt(brief: string) {
  return `Você escreve os prompts de UM anúncio em vídeo para o gerador de imagem e o Grok Imagine Video 1.5.

Pedido do usuário:
${brief.trim()}

Estrutura obrigatória:
- imagePrompt: um único quadro fotográfico realista, a pessoa parada, olhando para a câmera, pronta para falar. Sem texto, sem legenda, sem logotipo inventado. Se houver imagem base, a pessoa, a roupa e o produto saem dela. Não descreva outro produto.
- take1: 8 segundos. Primeira metade da mensagem. A pessoa fala em espanhol mexicano, tom natural, gestos pequenos. A fala cabe em 8 segundos (cerca de 18 a 24 palavras) e vai entre aspas.
- take2: 8 segundos. Continuação, sem repetir a fala do take 1. Fecha o argumento. Mesma pessoa, mesma roupa, mesmo cenário, mesma câmera.

Os três prompts saem em inglês. Só a fala entre aspas fica em espanhol mexicano.
Não peça música, legenda nem corte interno.

Responda somente JSON válido, sem markdown:
{
  "imagePrompt": "",
  "take1": "",
  "take2": ""
}`;
}
