function blockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0") {
    return true;
  }
  return /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host);
}

function decode(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
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

export async function fetchNewsArticle(rawUrl: string): Promise<{
  text: string;
  imageUrl: string | null;
}> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { text: "", imageUrl: null };
  }
  if (!["http:", "https:"].includes(url.protocol) || blockedHost(url.hostname)) {
    return { text: "", imageUrl: null };
  }
  if (url.hostname.includes("news.google.com")) {
    return { text: "", imageUrl: null };
  }

  try {
    const res = await fetch(url.toString(), {
      redirect: "follow",
      headers: {
        Accept: "text/html,text/plain",
        "User-Agent": "Mozilla/5.0 (compatible; NoratNews/1.0)",
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { text: "", imageUrl: null };
    const html = (await res.text()).slice(0, 400_000);
    const image = ogContent(html, "og:image");
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 3500);
    return {
      text,
      imageUrl: image.startsWith("http") ? image : null,
    };
  } catch {
    return { text: "", imageUrl: null };
  }
}
