import { assertPublicOriginHostname } from "@/lib/traffic-shield/origin-url";
import { isGoogleNewsUrl, resolveNewsUrl } from "@/lib/news/google-url";

export const NEWS_BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

export function parsePublicHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    if (!["http:", "https:"].includes(url.protocol)) return null;
    assertPublicOriginHostname(url.hostname);
    return url;
  } catch {
    return null;
  }
}

export function isHostedPlayer(url: string) {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return (
      host.includes("youtube.com") ||
      host === "youtu.be" ||
      host.includes("vimeo.com") ||
      host.includes("facebook.com") ||
      host.includes("fb.watch") ||
      host.includes("tiktok.com") ||
      host.includes("instagram.com")
    );
  } catch {
    return false;
  }
}

export function isDirectVideoUrl(url: string) {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function ogContent(html: string, property: string) {
  const named = new RegExp(
    `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']+)`,
    "i"
  );
  const reversed = new RegExp(
    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${property}["']`,
    "i"
  );
  return decode(html.match(named)?.[1] ?? html.match(reversed)?.[1] ?? "");
}

function firstMatch(html: string, pattern: RegExp) {
  return decode(html.match(pattern)?.[1] ?? "");
}

function absolutize(raw: string, base?: string) {
  if (!raw) return "";
  try {
    return new URL(raw, base).toString();
  } catch {
    return raw;
  }
}

function isGenericMedia(url: string) {
  return /\/(?:default|placeholder|sprite|favicon)(?:[-_.]|$)|\/ui\/images\/|\/logo(?:[-_.]|\.|$)/i.test(
    url
  );
}

function usableMediaUrl(raw: string, baseUrl?: string) {
  const parsed = parsePublicHttpUrl(absolutize(raw, baseUrl));
  if (!parsed || isGenericMedia(parsed.toString())) return null;
  return parsed.toString();
}

export function extractArticleMedia(
  html: string,
  baseUrl?: string
): {
  imageUrl: string | null;
  videoUrl: string | null;
} {
  const image =
    ogContent(html, "og:image") ||
    ogContent(html, "twitter:image") ||
    ogContent(html, "twitter:image:src");
  const video =
    ogContent(html, "og:video:secure_url") ||
    ogContent(html, "og:video:url") ||
    ogContent(html, "og:video") ||
    ogContent(html, "twitter:player:stream") ||
    firstMatch(html, /<source[^>]+type=["']video\/[^"']+["'][^>]+src=["']([^"']+)/i) ||
    firstMatch(html, /<source[^>]+src=["']([^"']+)["'][^>]+type=["']video\//i) ||
    firstMatch(html, /<video[^>]+src=["']([^"']+)/i) ||
    firstMatch(html, /<(?:iframe|embed)[^>]+src=["']([^"']*(?:youtube|youtu\.be|vimeo)[^"']*)/i);

  return {
    imageUrl: usableMediaUrl(image, baseUrl),
    videoUrl: usableMediaUrl(video, baseUrl),
  };
}

const emptyArticle = { text: "", imageUrl: null as string | null, videoUrl: null as string | null };

function articleFetchUrls(raw: string) {
  const urls: string[] = [];
  const add = (value: string) => {
    if (value && !urls.includes(value)) urls.push(value);
  };
  add(raw);
  try {
    const url = new URL(raw);
    if (url.hostname.startsWith("amp.")) {
      const rest = url.hostname.slice(4);
      url.hostname = rest.startsWith("www.") ? rest : `www.${rest}`;
      add(url.toString());
    }
  } catch {
    /* keep original */
  }
  return urls;
}

function landedOnHome(requested: string, finalUrl: string) {
  try {
    const from = new URL(requested);
    const to = new URL(finalUrl);
    return to.pathname === "/" && from.pathname.replace(/\/+$/, "") !== "";
  } catch {
    return false;
  }
}

function canonicalHref(html: string, base: string) {
  const href =
    html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1] ||
    html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i)?.[1];
  return href ? absolutize(href, base) : "";
}

function looksLikeHomePage(requested: string, finalUrl: string, html: string) {
  if (landedOnHome(requested, finalUrl)) return true;
  const canonical = canonicalHref(html, finalUrl);
  return Boolean(canonical && landedOnHome(requested, canonical));
}

function isChallengeHtml(html: string) {
  return (
    /<title>Just a moment\.\.\.<\/title>/i.test(html) ||
    /cf-browser-verification|challenge-platform/i.test(html)
  );
}

async function downloadArticleHtml(rawUrl: string) {
  for (const candidate of articleFetchUrls(rawUrl)) {
    const url = parsePublicHttpUrl(candidate);
    if (!url || isGoogleNewsUrl(url.toString())) continue;
    try {
      const res = await fetch(url.toString(), {
        redirect: "follow",
        headers: {
          Accept: "text/html,text/plain",
          "Accept-Language": "pt-BR,pt;q=0.9",
          "User-Agent": NEWS_BROWSER_UA,
        },
        signal: AbortSignal.timeout(8_000),
      });
      if (!res.ok) continue;
      const finalUrl = res.url || url.toString();
      if (landedOnHome(url.toString(), finalUrl)) continue;
      const html = (await res.text()).slice(0, 400_000);
      if (isChallengeHtml(html) || html.length < 4000) continue;
      if (looksLikeHomePage(url.toString(), finalUrl, html)) continue;
      return { url: finalUrl, html };
    } catch {
      /* try next candidate */
    }
  }
  return null;
}

export async function fetchArticleMedia(rawUrl: string): Promise<{
  imageUrl: string | null;
  videoUrl: string | null;
}> {
  try {
    const page = await downloadArticleHtml(rawUrl);
    if (!page) return { imageUrl: null, videoUrl: null };
    return extractArticleMedia(page.html, page.url);
  } catch {
    return { imageUrl: null, videoUrl: null };
  }
}

export async function fetchNewsArticle(rawUrl: string): Promise<{
  text: string;
  imageUrl: string | null;
  videoUrl: string | null;
}> {
  try {
    const resolved = await resolveNewsUrl(rawUrl);
    const page = await downloadArticleHtml(resolved);
    if (!page) return emptyArticle;
    const media = extractArticleMedia(page.html, page.url);
    const text = page.html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3500);
    return { text, ...media };
  } catch {
    return emptyArticle;
  }
}
