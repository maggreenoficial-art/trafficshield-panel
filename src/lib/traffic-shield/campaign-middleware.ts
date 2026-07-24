import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getCampaignBySlug } from "@/lib/db/traffic-campaigns";
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
import { getRequestHostname } from "@/lib/traffic-shield/domain-origin-proxy";
import { getTrafficDomainByHostname } from "@/lib/db/traffic-campaigns";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

const CAMPAIGN_CACHE_MS = 30_000;

type CampaignCache = {
  slug: string;
  campaign: Awaited<ReturnType<typeof getCampaignBySlug>>;
  config: ReturnType<typeof mergeTrafficConfig>;
  at: number;
};

const globalCache = globalThis as typeof globalThis & {
  __campaignCache?: Map<string, CampaignCache>;
};

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

function logCampaignClickAsync(
  origin: string,
  payload: Record<string, unknown>
): void {
  const secret = process.env.TRAFFIC_INTERNAL_SECRET ?? "vp-traffic-dev";
  fetch(`${origin}/api/traffic/campaign-log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-traffic-internal": secret,
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
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

  const geo = (request as NextRequest & { geo?: { country?: string } }).geo;
  const testMode = (params.vp_test as "offer" | "safe" | undefined) ?? null;
  const ip = getClientIp(request);
  const ua = request.headers.get("user-agent") ?? "";

  const result = evaluateCampaignTraffic({
    campaign,
    shieldConfig: config,
    ip,
    userAgent: ua,
    country: geo?.country,
    searchParams: params,
    hasVisitorCookie: request.cookies.has(VISITOR_COOKIE),
    testMode,
  });

  logCampaignClickAsync(request.nextUrl.origin, {
    tenantId,
    campaignId: campaign.id,
    destination: result.destination,
    country: geo?.country,
    device: detectDevice(ua),
    trafficSource: campaign.trafficSource,
    ipHash: hashIp(ip ?? "unknown"),
    reasons: result.reasons,
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
    searchParams.forEach((v, k) => {
      if (!["vp_t", "twr_t", "vp_test"].includes(k)) {
        preUrl.searchParams.set(k, v);
      }
    });
    return NextResponse.redirect(preUrl);
  }

  if (delivery.type === "rewrite") {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = delivery.target;
    const response = NextResponse.rewrite(rewriteUrl);
    response.headers.set("x-campaign-dest", result.destination);
    response.headers.set("x-campaign-slug", slug);
    return response;
  }

  const destUrl = /^https?:\/\//i.test(delivery.target)
    ? new URL(delivery.target)
    : new URL(delivery.target, request.url);
  searchParams.forEach((v, k) => {
    if (!["vp_t", "twr_t", "vp_test"].includes(k)) {
      destUrl.searchParams.set(k, v);
    }
  });
  return NextResponse.redirect(destUrl);
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
