import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getTrafficDomainByHostname } from "@/lib/db/traffic-campaigns";
import { getRootDomainFromHostname } from "@/lib/traffic-shield/campaign-hostname";
import { handleCampaignRoute } from "@/lib/traffic-shield/campaign-middleware";
import {
  getRequestHostname,
  isPanelHostname,
  proxyRequestToOrigin,
} from "@/lib/traffic-shield/domain-origin-proxy";

const DOMAIN_ROUTE_CACHE_MS = 30_000;

type DomainRouteEntry = {
  hostname: string;
  originUrl: string | null;
  at: number;
};

const globalCache = globalThis as typeof globalThis & {
  __domainRouteCache?: Map<string, DomainRouteEntry>;
};

async function loadDomainRoute(hostname: string): Promise<DomainRouteEntry | null> {
  const now = Date.now();
  const key = hostname.toLowerCase();

  if (!globalCache.__domainRouteCache) {
    globalCache.__domainRouteCache = new Map();
  }

  const cached = globalCache.__domainRouteCache.get(key);
  if (cached && now - cached.at < DOMAIN_ROUTE_CACHE_MS) {
    return cached;
  }

  const domain = await getTrafficDomainByHostname(hostname);
  if (!domain) return null;

  const entry: DomainRouteEntry = {
    hostname: key,
    originUrl: domain.originUrl,
    at: now,
  };

  globalCache.__domainRouteCache.set(key, entry);
  return entry;
}

export async function handleCustomDomainRoute(
  request: NextRequest
): Promise<NextResponse | null> {
  const hostname = getRequestHostname(request);
  if (!hostname || isPanelHostname(hostname)) return null;

  const route = await loadDomainRoute(hostname);
  if (!route) return null;

  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/c/")) {
    return handleCampaignRoute(request);
  }

  if (route.originUrl) {
    return proxyRequestToOrigin(request, route.originUrl, hostname);
  }

  const root = getRootDomainFromHostname(hostname);
  const redirectUrl = new URL(`https://www.${root}${pathname}${search}`);
  return NextResponse.redirect(redirectUrl, 302);
}
