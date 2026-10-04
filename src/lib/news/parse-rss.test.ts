import assert from "node:assert/strict";
import test from "node:test";
import { extractArticleMedia } from "./article";
import { isCassilandiaNews, mergeNews, parseRssItems } from "./parse-rss";

const SAMPLE = `<?xml version="1.0"?><rss><channel>
<item>
  <title>Prefeitura abre inscrição para feira — Portal Cassilândia</title>
  <link>https://news.google.com/rss/articles/abc</link>
  <pubDate>Sat, 04 Oct 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[<a href="https://portal.exemplo.com/feira">Prefeitura abre inscrição</a> <img src="https://cdn.exemplo.com/feira.jpg" />]]></description>
  <enclosure url="https://cdn.exemplo.com/feira.mp4" type="video/mp4" />
  <source url="https://portal.exemplo.com">Portal Cassilândia</source>
</item>
<item>
  <title>Sem link válido</title>
  <description>Só texto</description>
</item>
</channel></rss>`;

test("lê título, fonte, url real e foto do RSS", () => {
  const [item] = parseRssItems(SAMPLE);
  assert.equal(item.title, "Prefeitura abre inscrição para feira");
  assert.equal(item.source, "Portal Cassilândia");
  assert.equal(item.url, "https://portal.exemplo.com/feira");
  assert.equal(item.imageUrl, "https://cdn.exemplo.com/feira.jpg");
  assert.equal(item.videoUrl, "https://cdn.exemplo.com/feira.mp4");
  assert.equal(isCassilandiaNews(item), true);
});

test("junta feeds sem repetir a mesma URL", () => {
  const a = parseRssItems(SAMPLE);
  const merged = mergeNews([a, a]);
  assert.equal(merged.length, 1);
});

test("lê foto e vídeo do HTML da matéria", () => {
  const media = extractArticleMedia(
    `<meta property="og:image" content="https://cdn.exemplo.com/a.jpg" />
     <meta property="og:video" content="https://cdn.exemplo.com/a.mp4" />`
  );
  assert.equal(media.imageUrl, "https://cdn.exemplo.com/a.jpg");
  assert.equal(media.videoUrl, "https://cdn.exemplo.com/a.mp4");
});

test("resolve foto relativa contra a URL da matéria", () => {
  const media = extractArticleMedia(
    `<meta property="og:image" content="/foto.jpg" />`,
    "https://portal.exemplo.com/feira"
  );
  assert.equal(media.imageUrl, "https://portal.exemplo.com/foto.jpg");
});

test("ignora og:image genérico do portal", () => {
  const media = extractArticleMedia(
    `<meta property="og:image" content="https://cdn.exemplo.com/ui/images/2025/default.jpg" />`
  );
  assert.equal(media.imageUrl, null);
});

test("mantém link do Google News quando o RSS não traz a fonte", () => {
  const xml = `<?xml version="1.0"?><rss><channel>
<item>
  <title>Jovem morre em Cassilândia</title>
  <link>https://news.google.com/rss/articles/CBMiabc?hl=pt-BR&amp;gl=BR&amp;ceid=BR:pt-419</link>
  <description><![CDATA[<a href="https://news.google.com/rss/articles/CBMiabc?hl=pt-BR&amp;gl=BR&amp;ceid=BR:pt-419">Jovem morre</a>]]></description>
  <source url="https://midiamax.com.br">MidiaMax</source>
</item>
</channel></rss>`;
  const [item] = parseRssItems(xml);
  assert.equal(item.source, "MidiaMax");
  assert.match(item.url, /news\.google\.com\/articles\/CBMiabc/);
});
