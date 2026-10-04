const NEWS_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const BATCHEXECUTE_URL = "https://news.google.com/_/DotsSplashUi/data/batchexecute";

export function googleNewsArticleId(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.hostname !== "news.google.com") return null;
    const parts = url.pathname.split("/").filter(Boolean);
    const index = parts.findIndex((part) => part === "articles" || part === "read");
    const id = index >= 0 ? parts[index + 1] : "";
    return id || null;
  } catch {
    return null;
  }
}

export function isGoogleNewsUrl(raw: string) {
  return Boolean(googleNewsArticleId(raw));
}

export function normalizePublisherUrl(raw: string) {
  try {
    const url = new URL(raw);
    if (url.hostname.startsWith("amp.")) {
      const rest = url.hostname.slice(4);
      url.hostname = rest.startsWith("www.") ? rest : `www.${rest}`;
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function localeFrom(sourceUrl: string) {
  try {
    const url = new URL(sourceUrl);
    return {
      hl: url.searchParams.get("hl") || "pt-BR",
      gl: url.searchParams.get("gl") || "BR",
      ceid: url.searchParams.get("ceid") || "BR:pt-419",
    };
  } catch {
    return { hl: "pt-BR", gl: "BR", ceid: "BR:pt-419" };
  }
}

function paramsPageUrl(articleId: string, sourceUrl: string) {
  const { hl, gl, ceid } = localeFrom(sourceUrl);
  const url = new URL(`https://news.google.com/rss/articles/${articleId}`);
  url.searchParams.set("hl", hl);
  url.searchParams.set("gl", gl);
  url.searchParams.set("ceid", ceid);
  return url.toString();
}

export function parseGoogleNewsSignature(html: string) {
  const signature = html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const timestamp = html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!signature || !timestamp) return null;
  return { signature, timestamp };
}

export function parseGoogleNewsBatchexecute(text: string) {
  let body = text;
  if (body.includes("\n\n")) body = body.slice(body.indexOf("\n\n") + 2);
  body = body.trim();
  if (body.startsWith(")]}'")) {
    const newline = body.indexOf("\n");
    body = newline >= 0 ? body.slice(newline + 1) : body.slice(4);
  }
  const rows = JSON.parse(body.trim()) as unknown[];
  const decoded = new Map<string, string>();
  for (const row of rows) {
    if (!Array.isArray(row) || row.length < 3) continue;
    if (row[0] !== "wrb.fr" && row[1] !== "Fbv4je") continue;
    let payload: unknown = row[2];
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload) as unknown;
      } catch {
        continue;
      }
    }
    if (!Array.isArray(payload) || payload[0] !== "garturlres") continue;
    const url = payload[1];
    if (typeof url !== "string" || !url.startsWith("http")) continue;
    let requestId: string | null = null;
    for (let i = row.length - 1; i >= 3; i--) {
      if (row[i] != null) {
        requestId = String(row[i]);
        break;
      }
    }
    if (requestId) decoded.set(requestId, url);
  }
  return decoded;
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  if (!items.length) return [];
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await mapper(items[index], index);
    }
  }
  const size = Math.max(1, Math.min(concurrency, items.length));
  await Promise.all(Array.from({ length: size }, () => worker()));
  return results;
}

async function fetchDecodingParams(articleId: string, sourceUrl: string) {
  let current = paramsPageUrl(articleId, sourceUrl);
  for (let hop = 0; hop < 3; hop++) {
    const res = await fetch(current, {
      redirect: "manual",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "User-Agent": NEWS_UA,
      },
      signal: AbortSignal.timeout(12_000),
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      const next = new URL(location, current);
      if (next.hostname !== "news.google.com") break;
      current = next.toString();
      continue;
    }
    if (!res.ok) return null;
    const parsed = parseGoogleNewsSignature(await res.text());
    if (!parsed) return null;
    return { articleId, ...parsed };
  }
  return null;
}

function buildBatchexecuteBody(
  items: { requestId: string; articleId: string; timestamp: string; signature: string }[],
  ceid: string
) {
  const envelopes = items.map((item) => {
    const inner = [
      "garturlreq",
      [
        ["X", "X", ["X", "X"], null, null, 1, 1, ceid, null, 1, null, null, null, null, null, 0, 1],
        "X",
        "X",
        1,
        [1, 1, 1],
        1,
        1,
        null,
        0,
        0,
        null,
        0,
      ],
      item.articleId,
      /^\d+$/.test(item.timestamp) ? Number(item.timestamp) : item.timestamp,
      item.signature,
    ];
    return ["Fbv4je", JSON.stringify(inner), null, item.requestId];
  });
  return `f.req=${encodeURIComponent(JSON.stringify([envelopes]))}`;
}

export async function decodeGoogleNewsUrls(urls: string[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  const pending: { url: string; articleId: string }[] = [];
  const seen = new Set<string>();

  for (const url of urls) {
    const articleId = googleNewsArticleId(url);
    if (!articleId || seen.has(url)) continue;
    seen.add(url);
    pending.push({ url, articleId });
  }
  if (!pending.length) return resolved;

  const params = await mapPool(pending, 8, async (item) => {
    try {
      return await fetchDecodingParams(item.articleId, item.url);
    } catch {
      return null;
    }
  });

  const ready = pending.flatMap((item, index) => {
    const parsed = params[index];
    if (!parsed) return [];
    return [
      {
        url: item.url,
        requestId: String(index),
        articleId: parsed.articleId,
        timestamp: parsed.timestamp,
        signature: parsed.signature,
      },
    ];
  });
  if (!ready.length) return resolved;

  const ceid = localeFrom(pending[0].url).ceid;
  const res = await fetch(BATCHEXECUTE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      Origin: "https://news.google.com",
      Referer: "https://news.google.com/",
      "User-Agent": NEWS_UA,
    },
    body: buildBatchexecuteBody(ready, ceid),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) return resolved;

  const decoded = parseGoogleNewsBatchexecute(await res.text());
  for (const item of ready) {
    const publisher = decoded.get(item.requestId);
    if (publisher && !googleNewsArticleId(publisher)) {
      resolved.set(item.url, normalizePublisherUrl(publisher));
    }
  }
  return resolved;
}

export async function resolveNewsUrl(rawUrl: string): Promise<string> {
  if (!isGoogleNewsUrl(rawUrl)) return rawUrl;
  const decoded = await decodeGoogleNewsUrls([rawUrl]);
  return decoded.get(rawUrl) ?? rawUrl;
}

export { mapPool as mapNewsPool };
