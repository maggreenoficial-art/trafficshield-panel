import assert from "node:assert/strict";
import test from "node:test";
import { parseAdLibraryHtml, parseAdLibraryPage, adLibrarySearchUrl } from "./ad-library";

const html = `<html><script type="application/json" data-sjs>${JSON.stringify({
  ad_library_main: {
    search_results_connection: {
      count: 87,
      edges: [
        {
          node: {
            collated_results: [
              {
                ad_archive_id: "1320765540221734",
                page_id: "468037109734919",
                page_name: "Victor Pareto",
                start_date: 1781938800,
                end_date: 0,
                is_active: true,
                publisher_platform: ["FACEBOOK", "INSTAGRAM"],
                snapshot: {
                  page_name: "Victor Pareto",
                  title: "Queime gordura e ganhe massa muscular",
                  cta_text: "Saiba mais",
                  body: { text: "Participe do Desafio Atleta Híbrido" },
                  link_url: "http://m.timehibrido.com.br/rt/desafio",
                  display_format: "VIDEO",
                  images: [],
                  videos: [
                    {
                      video_hd_url: "https://video.fbcdn.net/o1/clip.mp4",
                      video_preview_image_url: "https://scontent.fbcdn.net/preview.jpg",
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  },
})}</script></html>`;

test("lê anúncio da Biblioteca da Meta no JSON da página", () => {
  const [ad] = parseAdLibraryHtml(html);
  assert.equal(ad.id, "1320765540221734");
  assert.equal(ad.pageName, "Victor Pareto");
  assert.equal(ad.cta, "Saiba mais");
  assert.match(ad.body, /Desafio Atleta/);
  assert.equal(ad.videoUrl, "https://video.fbcdn.net/o1/clip.mp4");
  assert.equal(ad.imageUrl, "https://scontent.fbcdn.net/preview.jpg");
  assert.equal(ad.snapshotUrl, "https://www.facebook.com/ads/library/?id=1320765540221734");
  assert.ok(ad.startDate);
  assert.equal(ad.endDate, null);
  assert.equal(ad.isActive, true);
});

test("lê o total da conexão de busca", () => {
  const page = parseAdLibraryPage(html);
  assert.equal(page.total, 87);
  assert.equal(page.ads.length, 1);
});

test("monta a URL da Biblioteca com o tema", () => {
  const url = adLibrarySearchUrl({
    keywords: "emagrecer",
    country: "BR",
    mediaType: "video",
  });
  assert.match(url, /facebook.com\/ads\/library/);
  assert.match(url, /q=emagrecer/);
  assert.match(url, /country=BR/);
  assert.match(url, /media_type=video/);
});
