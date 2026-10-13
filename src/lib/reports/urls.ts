const MAX_URLS = 10;

const BLOCKED_HOST = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|::1)$|(\.|^)norat\.cloud$/i;

export function isBlockedReportHost(hostname: string) {
  return BLOCKED_HOST.test(hostname);
}

export function parseReportUrls(raw: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/[\r\n,;]+/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let url: URL;
    try {
      url = new URL(withScheme);
    } catch {
      continue;
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (!url.hostname.includes(".")) continue;
    if (isBlockedReportHost(url.hostname)) continue;
    url.hash = "";
    const href = url.toString();
    const key = href.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(href);
    if (out.length >= MAX_URLS) break;
  }
  return out;
}

export function escapeReportText(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
