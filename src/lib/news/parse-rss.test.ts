import assert from "node:assert/strict";
import test from "node:test";
import { isCassilandiaNews, mergeNews, parseRssItems } from "./parse-rss";

const SAMPLE = `<?xml version="1.0"?><rss><channel>
<item>
  <title>Prefeitura abre inscrição para feira — Portal Cassilândia</title>
  <link>https://news.google.com/rss/articles/abc</link>
  <pubDate>Sat, 04 Oct 2026 12:00:00 GMT</pubDate>
  <description><![CDATA[<a href="https://portal.exemplo.com/feira">Prefeitura abre inscrição</a> <img src="https://cdn.exemplo.com/feira.jpg" />]]></description>
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
  assert.equal(isCassilandiaNews(item), true);
});

test("junta feeds sem repetir a mesma URL", () => {
  const a = parseRssItems(SAMPLE);
  const merged = mergeNews([a, a]);
  assert.equal(merged.length, 1);
});
