import type { NextRequest } from "next/server";
import { analyzeTraffic } from "@/lib/traffic-shield/detector";
import {
  getDefaultTrafficConfig,
  mergeTrafficConfig,
} from "@/lib/traffic-shield/config";
import type {
  TrafficAnalysisResult,
  TrafficShieldConfig,
} from "@/lib/traffic-shield/types";
import { getClientIp, hashIp } from "@/lib/request";

const VISITOR_COOKIE = "vp-visitor";
const CONFIG_CACHE_MS = 30_000;

type ConfigCache = { config: TrafficShieldConfig; at: number };

const globalCache = globalThis as typeof globalThis & {
  __trafficConfigCache?: ConfigCache;
};

function shouldSkipPath(pathname: string): boolean {
  return (
    pathname.startsWith("/gerenciaralojabt") ||
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/traffic") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico"
  );
}

async function loadTrafficConfig(origin: string): Promise<TrafficShieldConfig> {
  const now = Date.now();
  const cached = globalCache.__trafficConfigCache;
  if (cached && now - cached.at < CONFIG_CACHE_MS) {
    return cached.config;
  }

  try {
    const res = await fetch(`${origin}/api/traffic/config`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as Partial<TrafficShieldConfig>;
      const config = mergeTrafficConfig(data);
      globalCache.__trafficConfigCache = { config, at: now };
      return config;
    }
  } catch {
    // fallback
  }

  return getDefaultTrafficConfig();
}

function logTrafficAsync(
  origin: string,
  payload: Record<string, unknown>
): void {
  const secret = process.env.TRAFFIC_INTERNAL_SECRET ?? "vp-traffic-dev";
  fetch(`${origin}/api/traffic/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-traffic-internal": secret,
    },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export async function runTrafficShield(
  request: NextRequest
): Promise<{
  analysis: TrafficAnalysisResult;
  config: TrafficShieldConfig;
  ipHash: string;
  shouldBlock: boolean;
  rewritePath?: string;
}> {
  const { pathname, searchParams } = request.nextUrl;
  const config = await loadTrafficConfig(request.nextUrl.origin);
  const ip = getClientIp(request);
  const ipHash = hashIp(ip ?? "unknown");

  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const geo = (
    request as NextRequest & { geo?: { country?: string } }
  ).geo;

  const analysis = analyzeTraffic(
    {
      ip,
      userAgent: request.headers.get("user-agent") ?? undefined,
      path: pathname,
      method: request.method,
      referer: request.headers.get("referer") ?? undefined,
      acceptLanguage: request.headers.get("accept-language") ?? undefined,
      accept: request.headers.get("accept") ?? undefined,
      country: geo?.country,
      searchParams: params,
      hasVisitorCookie: request.cookies.has(VISITOR_COOKIE),
    },
    config
  );

  if (!shouldSkipPath(pathname) && config.enabled) {
    logTrafficAsync(request.nextUrl.origin, {
      ipHash,
      userAgent: request.headers.get("user-agent"),
      path: pathname,
      action: analysis.action,
      score: analysis.score,
      reasons: analysis.reasons,
      category: analysis.category,
      country: geo?.country,
    });
  }

  const shouldBlock =
    config.enabled &&
    config.mode !== "monitor" &&
    (analysis.action === "block" || analysis.action === "safe_page");

  return {
    analysis,
    config,
    ipHash,
    shouldBlock,
    rewritePath:
      analysis.action === "safe_page" ? analysis.safePagePath : undefined,
  };
}

export { VISITOR_COOKIE };
