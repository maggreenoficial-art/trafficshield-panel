import { timingSafeEqual } from "node:crypto";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { reportProxyLines } from "@/lib/reports/proxies";

export type FeedProxy = {
  host: string;
  port: number;
  username: string;
  password: string;
};

export function proxyFeedKey() {
  return process.env.PROXY_FEED_API_KEY?.trim() || "";
}

export function proxyFeedAuthorized(authorization: string | null, apiKeyHeader: string | null) {
  const expected = proxyFeedKey();
  const bearer = authorization?.match(/^Bearer\s+(\S+)\s*$/i)?.[1] ?? "";
  const given = (apiKeyHeader?.trim() || bearer).trim();
  if (!expected || !given) return false;
  const left = Buffer.from(given);
  const right = Buffer.from(expected);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function feedProxiesFromLines(lines: string[]): FeedProxy[] {
  return parseOfferProxyList(reportProxyLines(lines.join("\n")).join("\n")).map((item) => ({
    host: item.host,
    port: item.port,
    username: item.username,
    password: item.password,
  }));
}
