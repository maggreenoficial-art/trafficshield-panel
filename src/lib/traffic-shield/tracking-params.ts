/** Whitelist e helpers de params de ads para tracking. */

const TRACKED_PARAM_KEYS = new Set([
  "fbclid",
  "gclid",
  "wbraid",
  "gbraid",
  "ttclid",
  "tblci",
  "nbclid",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "campaign_id",
  "adset_id",
  "ad_id",
  "placement",
  "site_source_name",
]);

const PASSTHROUGH_SKIP = new Set([
  "vp_t",
  "twr_t",
  "vp_test",
  "vp_dest",
  "vp_to",
  "vp_ready",
]);

export const CLICK_COOKIE = "vp_cid";
export const VISITOR_COOKIE_KEY = "vp_vid";
export const CLICK_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export function extractTrackedParams(
  params: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, raw] of Object.entries(params)) {
    const k = key.toLowerCase();
    const value = raw?.trim();
    if (!value) continue;
    if (TRACKED_PARAM_KEYS.has(k) || k.startsWith("utm_")) {
      out[k] = value.slice(0, 500);
    }
  }
  return out;
}

export function extractClickIdFromParams(
  params: Record<string, string>
): string | null {
  for (const key of [
    "fbclid",
    "gclid",
    "wbraid",
    "gbraid",
    "ttclid",
    "tblci",
    "nbclid",
  ]) {
    const value = params[key]?.trim();
    if (value) return `${key}:${value.slice(0, 120)}`;
  }
  return null;
}

export function appendTrackedParamsToUrl(
  url: URL,
  params: Record<string, string>
): void {
  for (const [key, value] of Object.entries(params)) {
    if (PASSTHROUGH_SKIP.has(key)) continue;
    if (!url.searchParams.has(key)) {
      url.searchParams.set(key, value);
    }
  }
}

export function generateVisitorKey(): string {
  return (
    Math.random().toString(36).slice(2, 12) +
    Date.now().toString(36) +
    Math.random().toString(36).slice(2, 8)
  );
}
