import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  getCampaignBySlug,
  logCampaignClick,
} from "@/lib/db/traffic-campaigns";
import { getTrafficConfig } from "@/lib/db/traffic";
import {
  detectDevice,
  evaluateCampaignTraffic,
  resolveDeliveryPath,
} from "@/lib/traffic-shield/campaign-engine";
import {
  getDefaultTrafficConfig,
  mergeTrafficConfig,
} from "@/lib/traffic-shield/config";
import { TRAFFIC_CONFIG_KEY } from "@/lib/traffic-shield/config";
import { getClientIp, hashIp } from "@/lib/request";
import { VISITOR_COOKIE } from "@/lib/traffic-shield/middleware";
import {
  getRequestHostname,
  proxyAbsoluteUrl,
} from "@/lib/traffic-shield/domain-origin-proxy";
import { getTrafficDomainByHostname } from "@/lib/db/traffic-campaigns";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import type { TrafficCampaign } from "@/lib/traffic-shield/campaign-types";
import { assessCampaignAbuse } from "@/lib/traffic-shield/click-protection";
import {
  appendTrackedParamsToUrl,
  CLICK_COOKIE,
  CLICK_COOKIE_MAX_AGE,
  extractClickIdFromParams,
  extractTrackedParams,
  generateVisitorKey,
  VISITOR_COOKIE_KEY,
} from "@/lib/traffic-shield/tracking-params";

const CAMPAIGN_CACHE_MS = 30_000;

function resolveCampaignTestMode(
  params: Record<string, string>,
  campaign: TrafficCampaign
): "offer" | "safe" | null {
  const raw = params.vp_test;
  if (raw !== "offer" && raw !== "safe") return null;

  const allowOpen =
    process.env.NODE_ENV !== "production" ||
    process.env.TRAFFIC_ALLOW_TEST_MODE === "1";

  if (allowOpen) return raw;

  if (!campaign.uniqueTokenEnabled) return null;
  const token = params.vp_t ?? params.twr_t;
  if (token && token === campaign.uniqueToken) return raw;

  return null;
}

type CampaignCache = {
  slug: string;
  campaign: Awaited<ReturnType<typeof getCampaignBySlug>>;
  config: ReturnType<typeof mergeTrafficConfig>;
  at: number;
};

const globalCache = globalThis as typeof globalThis & {
  __campaignCache?: Map<string, CampaignCache>;
};

export function invalidateCampaignCache(): void {
  globalCache.__campaignCache?.clear();
}

async function loadShieldConfig(
  tenantId?: string
): Promise<ReturnType<typeof mergeTrafficConfig>> {
  if (!hasAdminClient()) return getDefaultTrafficConfig();
  if (tenantId) {
    try {
      return await getTrafficConfig(tenantId);
    } catch {
      return getDefaultTrafficConfig();
    }
  }
  try {
    const supabase = createAdminClient();
    const { data } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", TRAFFIC_CONFIG_KEY)
      .single();
    return mergeTrafficConfig(data?.value as Parameters<typeof mergeTrafficConfig>[0]);
  } catch {
    return getDefaultTrafficConfig();
  }
}

async function loadCampaign(slug: string, tenantId?: string) {
  const now = Date.now();
  const cacheKey = tenantId ? `${tenantId}:${slug}` : slug;
  if (!globalCache.__campaignCache) {
    globalCache.__campaignCache = new Map();
  }
  const cached = globalCache.__campaignCache.get(cacheKey);
  if (cached && now - cached.at < CAMPAIGN_CACHE_MS) {
    return cached;
  }

  const [campaign, config] = await Promise.all([
    getCampaignBySlug(slug, tenantId),
    loadShieldConfig(tenantId),
  ]);

  const entry: CampaignCache = { slug, campaign, config, at: now };
  globalCache.__campaignCache.set(cacheKey, entry);
  return entry;
}

function attachTrackingCookies(
  response: NextResponse,
  opts: { clickRowId: string | null; visitorKey: string; destination: string }
): NextResponse {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(VISITOR_COOKIE_KEY, opts.visitorKey, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: CLICK_COOKIE_MAX_AGE,
  });
  if (opts.destination === "offer" && opts.clickRowId) {
    response.cookies.set(CLICK_COOKIE, opts.clickRowId, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: CLICK_COOKIE_MAX_AGE,
    });
  }
  return response;
}

export async function handleCampaignRoute(
  request: NextRequest
): Promise<NextResponse | null> {
  const { pathname, searchParams } = request.nextUrl;
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "c" || !parts[1]) return null;

  const slug = parts[1];

  if (parts[2] === "pre") {
    return handlePrePage(request, slug, searchParams);
  }

  const hostname = getRequestHostname(request);
  const domain = hostname
    ? await getTrafficDomainByHostname(hostname)
    : null;
  const tenantId = domain?.tenantId;

  const { campaign, config } = await loadCampaign(slug, tenantId);
  if (!campaign) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    params[k] = v;
  });

  const trackedParams = extractTrackedParams(params);
  const platformClickId = extractClickIdFromParams(params);
  const visitorKey =
    request.cookies.get(VISITOR_COOKIE_KEY)?.value || generateVisitorKey();

  const geo = (request as NextRequest & { geo?: { country?: string } }).geo;
  const testMode = resolveCampaignTestMode(params, campaign);
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";
  const ipHash = hashIp(ip ?? "unknown");
  const token = params.vp_t ?? params.twr_t ?? null;

  const abuse =
    testMode
      ? { ok: true, reasons: [] as string[] }
      : assessCampaignAbuse({
          campaignId: campaign.id,
          ipHash,
          token,
          source: campaign.trafficSource,
          params,
        });

  const result = evaluateCampaignTraffic({
    campaign,
    shieldConfig: config,
    ip,
    userAgent: ua,
    country: geo?.country,
    searchParams: params,
    hasVisitorCookie: request.cookies.has(VISITOR_COOKIE),
    testMode,
    abuseReasons: abuse.ok ? undefined : abuse.reasons,
  });

  const clickRowId = await logCampaignClick({
    tenantId,
    campaignId: campaign.id,
    destination: result.destination,
    country: geo?.country,
    device: detectDevice(ua),
    trafficSource: campaign.trafficSource,
    ipHash,
    reasons: result.reasons,
    queryParams: trackedParams,
    clickId: platformClickId,
    visitorKey,
  });

  const delivery = resolveDeliveryPath(result, slug, {
    safeDeliveryMethod: campaign.deliveryMethod,
    offerDeliveryMethod: campaign.offerDeliveryMethod,
  });

  if (delivery.type === "pre_page") {
    const preUrl = new URL(`/c/${slug}/pre`, request.url);
    preUrl.searchParams.set("vp_dest", result.destination);
    preUrl.searchParams.set(
      "vp_to",
      result.destination === "offer" ? result.offerPageUrl : result.safePageUrl
    );
    appendTrackedParamsToUrl(preUrl, trackedParams);
    searchParams.forEach((v, k) => {
      if (!["vp_t", "twr_t", "vp_test"].includes(k) && !preUrl.searchParams.has(k)) {
        preUrl.searchParams.set(k, v);
      }
    });
    return attachTrackingCookies(NextResponse.redirect(preUrl), {
      clickRowId,
      visitorKey,
      destination: result.destination,
    });
  }

  if (delivery.type === "mirror_proxy") {
    const response = await proxyAbsoluteUrl(request, delivery.target);
    response.headers.set("x-campaign-dest", result.destination);
    response.headers.set("x-campaign-slug", slug);
    response.headers.set("x-campaign-delivery", "mirror");
    return attachTrackingCookies(response, {
      clickRowId,
      visitorKey,
      destination: result.destination,
    });
  }

  if (delivery.type === "rewrite") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = delivery.target;
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("x-campaign-dest", result.destination);
    response.headers.set("x-campaign-slug", slug);
    return attachTrackingCookies(response, {
      clickRowId,
      visitorKey,
      destination: result.destination,
    });
  }

  const destUrl = /^https?:\/\//i.test(delivery.target)
    ? new URL(delivery.target)
    : new URL(delivery.target, request.url);
  appendTrackedParamsToUrl(destUrl, trackedParams);
  searchParams.forEach((v, k) => {
    if (!["vp_t", "twr_t", "vp_test"].includes(k) && !destUrl.searchParams.has(k)) {
      destUrl.searchParams.set(k, v);
    }
  });
  return attachTrackingCookies(NextResponse.redirect(destUrl), {
    clickRowId,
    visitorKey,
    destination: result.destination,
  });
}

function handlePrePage(
  request: NextRequest,
  slug: string,
  searchParams: URLSearchParams
): NextResponse {
  if (searchParams.get("vp_ready") === "1") {
    return NextResponse.next();
  }

  const preUrl = request.nextUrl.clone();
  preUrl.searchParams.set("vp_ready", "1");
  return NextResponse.redirect(preUrl);
}
