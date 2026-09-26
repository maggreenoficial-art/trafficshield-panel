const MAX_CHARS = 8000;

function blockedHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0"
  ) {
    return true;
  }
  if (
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[0-1])\.)/.test(host)
  ) {
    return true;
  }
  return host === "::1";
}

function htmlToText(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CHARS);
}

export async function fetchReferencePage(rawUrl: string): Promise<{
  url: string;
  title: string;
  text: string;
}> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new Error("URL de referência inválida.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Use http ou https na página de referência.");
  }
  if (blockedHost(url.hostname)) {
    throw new Error("Esse endereço não pode ser usado como referência.");
  }

  const res = await fetch(url.toString(), {
    redirect: "follow",
    headers: {
      Accept: "text/html,text/plain",
      "User-Agent": "TrafficShieldDev/1.0",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!res.ok) {
    throw new Error(`Página de referência respondeu HTTP ${res.status}.`);
  }
  const html = (await res.text()).slice(0, 400_000);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = (titleMatch?.[1] ?? url.hostname).replace(/\s+/g, " ").trim();
  const text = htmlToText(html);
  if (text.length < 40) {
    throw new Error("A página não devolveu texto suficiente para a IA.");
  }
  return { url: url.toString(), title: title.slice(0, 180), text };
}
