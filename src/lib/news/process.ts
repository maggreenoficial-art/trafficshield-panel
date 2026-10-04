import { chatGrok46 } from "@/lib/kie/grok-chat";
import { fetchNewsArticle } from "@/lib/news/article";
import { resolveNewsUrl } from "@/lib/news/google-url";
import type { NewsDraft, NewsItem } from "@/lib/news/types";

function extractJson(raw: string) {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i)?.[1];
  const slice = (fenced ?? raw).trim();
  const start = slice.indexOf("{");
  const end = slice.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("A IA não devolveu o texto do Instagram.");
  return JSON.parse(slice.slice(start, end + 1)) as {
    headline?: string;
    caption?: string;
    imagePrompt?: string;
  };
}

export async function produceNewsDraft(news: NewsItem): Promise<NewsDraft> {
  const url = await resolveNewsUrl(news.url);
  const article = await fetchNewsArticle(url);
  const imageUrl = news.imageUrl || article.imageUrl;
  const videoUrl = news.videoUrl || article.videoUrl;
  const prompt = `Você é o editor de Instagram de um portal de Cassilândia, MS.

Escreva a produção de UMA notícia real. Não invente fato, nome, número nem desfecho.

Notícia:
Título: ${news.title}
Fonte: ${news.source}
Link: ${url}
Resumo: ${news.summary}
Texto da matéria: ${article.text || "(só o título e o resumo)"}

Responda SOMENTE JSON válido, sem markdown:
{
  "headline": "manchete curta, até 12 palavras, em português",
  "caption": "legenda de Instagram em português, 4 a 8 linhas, tom de portal local, 4 a 8 hashtags no final incluindo #Cassilandia e #CassilandiaMS. Sem link encurtado.",
  "imagePrompt": "prompt em inglês para gerar a arte 9:16: keep the first reference as the exact page mockup/frame; put this news inside the content area; keep the second reference as the brand logo in the logo place; ${imageUrl ? "use the third reference as the news photo inside the mockup;" : ""} do not invent another newspaper or phone; sharp, photorealistic"
}`;

  const parsed = extractJson(await chatGrok46(prompt));
  const headline = (parsed.headline || news.title).trim().slice(0, 140);
  const caption = (parsed.caption || "").trim();
  const imagePrompt = (parsed.imagePrompt || "").trim();
  if (!caption) throw new Error("A IA não escreveu a legenda.");

  return {
    news: { ...news, url, imageUrl, videoUrl },
    headline,
    caption,
    imagePrompt:
      imagePrompt ||
      `Vertical 9:16 Instagram news post. Keep the first reference as the exact page mockup. Place the news "${headline}" inside the mockup content area. Keep the second reference as the brand logo. Photorealistic, sharp type.`,
  };
}

export function composeStoryboardPrompt(draft: NewsDraft) {
  return [
    "Vertical 9:16 Instagram post of a local news page.",
    "The first reference is the exact page mockup. Keep its frame, colors, chrome and empty content hole. Do not invent another layout.",
    "Place this news inside the mockup content area only.",
    `Headline: ${draft.headline}.`,
    "The second reference is the brand logo. Put it only where a logo already belongs on this mockup. Do not invent another mark.",
    draft.news.imageUrl
      ? "The third reference is the news photo. Use it as the photo inside the mockup, not as a new background."
      : "If there is no news photo, illustrate the scene inside the mockup without changing the frame.",
    draft.imagePrompt,
  ].join(" ");
}
