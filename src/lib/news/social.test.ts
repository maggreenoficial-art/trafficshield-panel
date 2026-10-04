import assert from "node:assert/strict";
import test from "node:test";
import { extractArticleMedia } from "./article";
import {
  extractSocialVideoUrls,
  instagramPostUrl,
  parseYoutubeSearchHtml,
  youtubeVideoId,
} from "./social";

test("lê id válido do YouTube e recusa template", () => {
  assert.equal(youtubeVideoId("https://www.youtube.com/watch?v=VN8jGDuMoi4"), "VN8jGDuMoi4");
  assert.equal(youtubeVideoId("https://www.youtube.com/embed/${youtubeId}"), null);
  assert.equal(youtubeVideoId("https://youtu.be/VN8jGDuMoi4"), "VN8jGDuMoi4");
});

test("normaliza Reel do Instagram", () => {
  assert.equal(
    instagramPostUrl("https://www.instagram.com/reel/DS7vw7FDTkU/?igsh=abc"),
    "https://www.instagram.com/reel/DS7vw7FDTkU/"
  );
  assert.equal(instagramPostUrl("https://midiamax.com.br/policia"), null);
});

test("acha YouTube e Instagram no HTML da matéria", () => {
  const urls = extractSocialVideoUrls(`
    <iframe src="https://www.youtube.com/embed/VN8jGDuMoi4"></iframe>
    <a href="https://www.instagram.com/reel/DS7vw7FDTkU/">reel</a>
  `);
  assert.deepEqual(urls, [
    "https://www.youtube.com/watch?v=VN8jGDuMoi4",
    "https://www.instagram.com/reel/DS7vw7FDTkU/",
  ]);
});

test("não usa template de YouTube nem webm de enfeite como vídeo da matéria", () => {
  const media = extractArticleMedia(`
    <meta property="og:image" content="https://cdn.exemplo.com/a.jpg" />
    <iframe src="https://www.youtube.com/embed/\${youtubeId}?x"></iframe>
    <source src="https://cdn.exemplo.com/theme/grill.webm" type="video/webm" />
  `);
  assert.equal(media.videoUrl, null);
});

test("aceita miniatura hqdefault do YouTube", () => {
  const media = extractArticleMedia(
    `<meta property="og:image" content="https://i.ytimg.com/vi/VN8jGDuMoi4/hqdefault.jpg" />`
  );
  assert.equal(media.imageUrl, "https://i.ytimg.com/vi/VN8jGDuMoi4/hqdefault.jpg");
});

test("lê vídeos da busca do YouTube", () => {
  const html = `ytInitialData = {"contents":{"videoRenderer":{"videoId":"VN8jGDuMoi4","title":{"runs":[{"text":"Notícia em Cassilândia"}]},"ownerText":{"runs":[{"text":"Jornal"}]}}}};</script>`;
  const [item] = parseYoutubeSearchHtml(html);
  assert.equal(item.kind, "youtube");
  assert.equal(item.videoUrl, "https://www.youtube.com/watch?v=VN8jGDuMoi4");
  assert.match(item.imageUrl ?? "", /hqdefault\.jpg/);
});
