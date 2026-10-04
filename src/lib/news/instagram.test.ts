import assert from "node:assert/strict";
import test from "node:test";
import {
  formatInstagramSource,
  parseInstagramCrawlerHtml,
  parseInstagramOgTitle,
  parseInstagramSharedBy,
  parseInstagramVideoUrl,
} from "./instagram";
import { newsItemFromInstagram } from "./social";

test("lê o nome da página no título do Instagram", () => {
  const parsed = parseInstagramOgTitle(
    "Luiz Antonio on Instagram: &quot;Escola Hermelinda Barbosa Leal&quot;"
  );
  assert.equal(parsed.pageName, "Luiz Antonio");
  assert.match(parsed.caption, /Hermelinda/);
});

test("lê o nome da página no oEmbed", () => {
  const parsed = parseInstagramSharedBy(
    "A post shared by Prefeitura de Cassilândia (@prefeituracassilandia)"
  );
  assert.equal(parsed.pageName, "Prefeitura de Cassilândia");
  assert.equal(parsed.username, "prefeituracassilandia");
  assert.equal(
    formatInstagramSource(parsed),
    "Prefeitura de Cassilândia · @prefeituracassilandia"
  );
});

test("separa Reel com arquivo de vídeo e post com foto", () => {
  const reel = parseInstagramCrawlerHtml(
    `<meta property="og:title" content="Luiz Antonio on Instagram: &quot;Escola&quot;" />
     <meta property="og:image" content="https://scontent.cdninstagram.com/v/t51.jpg" />
     38 likes, 0 comments - gazeta_newsonline on October 4, 2026
     "video_versions":[{"type":101,"url":"https:\\/\\/instagram.fna.fbcdn.net\\/o1\\/a.mp4?oe=1"},{"type":103,"url":"https:\\/\\/instagram.fna.fbcdn.net\\/o1\\/b.mp4?oe=1"}]`,
    "https://www.instagram.com/reel/DeErVEaRBOy/"
  );
  assert.equal(reel.mediaKind, "video");
  assert.equal(reel.pageName, "Luiz Antonio");
  assert.equal(reel.username, "gazeta_newsonline");
  assert.equal(reel.videoUrl, "https://instagram.fna.fbcdn.net/o1/b.mp4?oe=1");
  assert.match(reel.imageUrl ?? "", /t51\.jpg/);

  const photo = parseInstagramCrawlerHtml(
    `<meta property="og:title" content="MSConecta on Instagram: &quot;Vacinação&quot;" />
     <meta property="og:image" content="https://scontent.cdninstagram.com/v/foto.jpg" />`,
    "https://www.instagram.com/p/DeAolFiEQZE/"
  );
  assert.equal(photo.mediaKind, "image");
  assert.equal(photo.pageName, "MSConecta");
  assert.equal(photo.videoUrl, null);
});

test("extrai a URL do mp4 escapada", () => {
  assert.equal(
    parseInstagramVideoUrl(
      `"video_versions":[{"type":101,"url":"https:\\/\\/instagram.fna.fbcdn.net\\/v\\/clip.mp4?_nc=1"}]`
    ),
    "https://instagram.fna.fbcdn.net/v/clip.mp4?_nc=1"
  );
});

test("post do Instagram não vira vídeo só porque o link é do Instagram", () => {
  const post = newsItemFromInstagram({
    url: "https://www.instagram.com/p/DeAolFiEQZE/?hl=pt",
    title: "A Secretaria Municipal de Saúde de Cassilândia iniciou uma mobilização",
    publishedAt: "2026-10-02T23:11:16.000Z",
  });
  assert.equal(post?.kind, "instagram");
  assert.equal(post?.mediaKind, "image");
  assert.equal(post?.videoUrl, null);
  assert.equal(post?.url, "https://www.instagram.com/p/DeAolFiEQZE/");
});

test("Reel do Instagram já nasce como vídeo", () => {
  const reel = newsItemFromInstagram({
    url: "https://www.instagram.com/reel/DeErVEaRBOy/",
    title: "Escola Hermelinda",
  });
  assert.equal(reel?.mediaKind, "video");
  assert.equal(reel?.videoUrl, "https://www.instagram.com/reel/DeErVEaRBOy/");
});
