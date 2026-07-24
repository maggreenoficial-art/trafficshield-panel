import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTrafficDomainByHostname } from "@/lib/db/traffic-campaigns";
import { handleCampaignRoute } from "@/lib/traffic-shield/campaign-middleware";
import {
  getRequestHostname,
  isPanelHostname,
  proxyRequestToOrigin,
} from "@/lib/traffic-shield/domain-origin-proxy";

const DOMAIN_ROUTE_CACHE_MS = 30_000;

type DomainRouteCache = {
  hostname: string;
  originUrl: string | null;
  at: number;
};

const globalCache = globalThis as typeof globalThis & {
  __domainRouteCache?: Map<string, DomainRouteCache>;
};

async function loadDomainOrigin(
  hostname: string
): Promise<string | null> {
  const now = Date.now();
  const key = hostname.toLowerCase();

  if (!globalCache.__domainRouteCache) {
    globalCache.__domainRouteCache = new Map();
  }

  const cached = globalCache.__domainRouteCache.get(key);
  if (cached && now - cached.at < DOMAIN_ROUTE_CACHE_MS) {
    return cached.originUrl;
  }

  const domain = await getTrafficDomainByHostname(hostname);
  const originUrl = domain?.originUrl ?? null;

  globalCache.__domainRouteCache.set(key, {
    hostname: key,
    originUrl,
    at: now,
  });

  return originUrl;
}

export async function handleCustomDomainRoute(
  request: NextRequest
): Promise<NextResponse | null> {
  const hostname = getRequestHostname(request);
  if (!hostname || isPanelHostname(hostname)) return null;

  const { pathname } = request.nextUrl;
  const originUrl = await loadDomainOrigin(hostname);

  if (!originUrl) return null;

  if (pathname.startsWith("/c/")) {
    return handleCampaignRoute(request);
  }

  return proxyRequestToOrigin(request, originUrl, hostname);
}
