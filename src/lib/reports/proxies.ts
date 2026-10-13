import { parseOfferProxyList } from "@/lib/offers/proxy-parse";

export const REPORT_PROXY_LIMIT = 1000;

export function reportProxyLines(raw: string, limit = REPORT_PROXY_LIMIT): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const item of parseOfferProxyList(raw)) {
    const line = `${item.host}:${item.port}@${item.username}:${item.password}`;
    if (seen.has(line)) continue;
    seen.add(line);
    lines.push(line);
    if (lines.length >= limit) break;
  }
  return lines;
}
