import { chatGrok46 } from "@/lib/kie/grok-chat";
import { fetchNewsArticle } from "@/lib/news/article";
import {
  buildFeedTitle,
  composeFeedImagePrompt,
  formatFeedHeadline,
  HEADLINE_DEATH_RULE,
  HEADLINE_EDITOR_RULE,
  HEADLINE_SPECIFIC_RULE,
  HEADLINE_VERB_RULE,
  isUrgentNews,
} from "@/lib/news/feed-title";
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
  const prompt = `Você é o editor do feed do portal Informa Cassilândia.

Escreva a produção de UMA notícia real. Não invente fato, nome, número nem desfecho.

Notícia:
Título: ${news.title}
Fonte: ${news.source}
Link: ${url}
Resumo: ${news.summary}
Texto da matéria: ${article.text || "(só o título e o resumo)"}

Regras do título:
- No máximo 9 palavras e 4 linhas. Corte o que for óbvio. "de Cassilândia" só se for essencial.
- Verbo no presente. Sem ponto final.
- Coloque entre colchetes 1 a 3 palavras que sejam O FATO (o que aconteceu ou o número). Nunca coloque artigo, preposição ou conector entre colchetes (com, de, em, para, no, na, a, o).
- ${HEADLINE_EDITOR_RULE}
- ${HEADLINE_VERB_RULE}
- ${HEADLINE_SPECIFIC_RULE}
- ${HEADLINE_DEATH_RULE}
- Errado, vago: Prefeitura inicia projeto piloto no Jardim Campo Grande
- Certo: PROJETO-PILOTO LEVA [CONTÊINERES DE LIXO] AO JARDIM CAMPO GRANDE

Responda SOMENTE JSON válido, sem markdown:
{
  "headline": "título em caixa alta seguindo as regras",
  "caption": "legenda de Instagram em português, 4 a 8 linhas, tom de portal local, 4 a 8 hashtags no final incluindo #Cassilandia e #CassilandiaMS. Sem link encurtado."
}`;

  const parsed = extractJson(await chatGrok46(prompt));
  const headline = formatFeedHeadline(buildFeedTitle(parsed.headline || news.title)).slice(0, 180);
  const caption = (parsed.caption || "").trim();
  if (!caption) throw new Error("A IA não escreveu a legenda.");
  const urgent = isUrgentNews(`${headline}\n${news.title}\n${news.summary}`);

  return {
    news: { ...news, url, imageUrl, videoUrl },
    headline,
    caption,
    imagePrompt: composeFeedImagePrompt({
      headline,
      urgent,
      hasPhoto: Boolean(imageUrl),
    }),
  };
}

export function composeStoryboardPrompt(draft: NewsDraft) {
  return composeFeedImagePrompt({
    headline: draft.headline,
    urgent: isUrgentNews(
      `${draft.headline}\n${draft.news?.title ?? ""}\n${draft.news?.summary ?? ""}`
    ),
    hasPhoto: Boolean(draft.news?.imageUrl),
  });
}
