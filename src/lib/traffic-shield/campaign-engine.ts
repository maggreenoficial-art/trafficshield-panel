import { analyzeTraffic } from "@/lib/traffic-shield/detector";
import type { TrafficShieldConfig } from "@/lib/traffic-shield/types";
import type {
  CampaignDestination,
  CampaignEvaluationResult,
  DeliveryMethod,
  DeviceType,
  TrafficCampaign,
  TrafficSource,
} from "@/lib/traffic-shield/campaign-types";

const SOURCE_PARAMS: Record<TrafficSource, string[]> = {
  meta: ["fbclid", "utm_source=facebook", "utm_source=meta", "utm_source=ig"],
  google: ["gclid", "utm_source=google"],
  tiktok: ["ttclid", "utm_source=tiktok"],
  taboola: ["utm_source=taboola", "tblci"],
  newsbreak: ["utm_source=newsbreak", "nbclid"],
  mgid: ["utm_source=mgid"],
  rumble: ["utm_source=rumble"],
  native: ["utm_source=outbrain", "utm_medium=native"],
  other: [],
};

export function detectDevice(userAgent: string): DeviceType {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|windows phone/i.test(ua)) {
    return "mobile";
  }
  return "desktop";
}

function normalizePageUrl(url: string): string {
  const trimmed = url.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).href;
    } catch {
      return trimmed;
    }
  }
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function isExternalUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

function hasTrafficSourceSignal(
  source: TrafficSource,
  params: Record<string, string>
): boolean {
  if (source === "other") return true;

  const keys = Object.keys(params);
  const utm = (params.utm_source ?? "").toLowerCase();
  if (source === "meta" && keys.some((k) => k === "fbclid")) return true;
  if (source === "google" && keys.some((k) => k === "gclid")) return true;
  if (source === "tiktok" && keys.some((k) => k === "ttclid")) return true;
  if (source === "taboola" && utm.includes("taboola")) return true;
  if (source === "newsbreak" && utm.includes("newsbreak")) return true;
  if (source === "mgid" && utm.includes("mgid")) return true;
  if (source === "rumble" && utm.includes("rumble")) return true;

  const checks = SOURCE_PARAMS[source];
  return checks.some((check) => {
    if (check.includes("=")) {
      const [key, val] = check.split("=");
      return params[key]?.toLowerCase().includes(val);
    }
    return keys.includes(check);
  }) || (source === "native" && Boolean(utm));
}

export function evaluateCampaignTraffic(input: {
  campaign: TrafficCampaign;
  shieldConfig: TrafficShieldConfig;
  ip?: string;
  userAgent?: string;
  country?: string;
  searchParams: Record<string, string>;
  hasVisitorCookie?: boolean;
  testMode?: "offer" | "safe" | null;
}): CampaignEvaluationResult {
  const { campaign, shieldConfig } = input;
  const reasons: string[] = [];
  let qualified = true;

  if (input.testMode === "offer") {
    return buildResult(campaign, "offer", ["test_mode_offer"], 0);
  }
  if (input.testMode === "safe") {
    return buildResult(campaign, "safe", ["test_mode_safe"], 100);
  }

  if (campaign.status !== "active") {
    return buildResult(campaign, "safe", ["campaign_inactive"], 100);
  }

  if (campaign.uniqueTokenEnabled) {
    const token = input.searchParams.vp_t ?? input.searchParams.twr_t;
    if (!token || token !== campaign.uniqueToken) {
      reasons.push("invalid_token");
      qualified = false;
    }
  }

  if (
    campaign.allowedCountries.length > 0 &&
    input.country &&
    !campaign.allowedCountries.includes(input.country)
  ) {
    reasons.push(`country_not_allowed:${input.country}`);
    qualified = false;
  }

  const device = detectDevice(input.userAgent ?? "");
  if (
    campaign.allowedDevices.length > 0 &&
    !campaign.allowedDevices.includes(device)
  ) {
    reasons.push(`device_not_allowed:${device}`);
    qualified = false;
  }

  if (!hasTrafficSourceSignal(campaign.trafficSource, input.searchParams)) {
    reasons.push("traffic_source_mismatch");
    qualified = false;
  }

  const analysis = analyzeTraffic(
    {
      ip: input.ip,
      userAgent: input.userAgent,
      path: `/c/${campaign.slug}`,
      method: "GET",
      country: input.country,
      searchParams: input.searchParams,
      hasVisitorCookie: input.hasVisitorCookie,
    },
    shieldConfig
  );

  if (
    analysis.action === "block" ||
    analysis.action === "safe_page" ||
    analysis.category === "bot" ||
    analysis.category === "scraper"
  ) {
    reasons.push(...analysis.reasons, "bot_detected");
    qualified = false;
  } else if (analysis.action === "suspicious") {
    reasons.push(...analysis.reasons, "suspicious_traffic");
    if (shieldConfig.mode === "strict") qualified = false;
  }

  const destination: CampaignDestination = qualified ? "offer" : "safe";
  return buildResult(campaign, destination, reasons, analysis.score);
}

function buildResult(
  campaign: TrafficCampaign,
  destination: CampaignDestination,
  reasons: string[],
  score: number
): CampaignEvaluationResult {
  return {
    destination,
    reasons,
    score,
    deliveryMethod: campaign.deliveryMethod,
    safePageUrl: normalizePageUrl(campaign.safePageUrl),
    offerPageUrl: normalizePageUrl(campaign.offerPageUrl),
    campaignId: campaign.id,
    campaignSlug: campaign.slug,
  };
}

export function buildCampaignUrl(
  origin: string,
  campaign: TrafficCampaign,
  domainHostname?: string
): { url: string; params: string } {
  const base = domainHostname
    ? `https://${domainHostname}`
    : origin.replace(/\/$/, "");

  const path = `/c/${campaign.slug}`;
  const params = new URLSearchParams();
  if (campaign.uniqueTokenEnabled) {
    params.set("vp_t", campaign.uniqueToken);
  }

  const sourceParam = getSourceTrackingParam(campaign.trafficSource);
  if (sourceParam) {
    const [key, value] = sourceParam.split("=");
    params.set(key, value);
  }

  const paramStr = params.toString();
  return {
    url: `${base}${path}`,
    params: paramStr,
  };
}

function getSourceTrackingParam(source: TrafficSource): string | null {
  switch (source) {
    case "meta":
      return "utm_source=facebook";
    case "google":
      return "utm_source=google";
    case "tiktok":
      return "utm_source=tiktok";
    case "taboola":
      return "utm_source=taboola";
    case "newsbreak":
      return "utm_source=newsbreak";
    case "mgid":
      return "utm_source=mgid";
    case "rumble":
      return "utm_source=rumble";
    case "native":
      return "utm_medium=native";
    default:
      return null;
  }
}

export function resolveDeliveryPath(
  result: CampaignEvaluationResult,
  slug: string,
  options?: {
    safeDeliveryMethod?: DeliveryMethod;
    offerDeliveryMethod?: DeliveryMethod;
  }
): { type: "redirect" | "rewrite" | "pre_page"; target: string } {
  const destPath =
    result.destination === "offer"
      ? result.offerPageUrl
      : result.safePageUrl;

  const method =
    result.destination === "offer"
      ? (options?.offerDeliveryMethod ?? result.deliveryMethod)
      : (options?.safeDeliveryMethod ?? result.deliveryMethod);

  if (
    (method === "mirror" || method === "unpack") &&
    isExternalUrl(destPath)
  ) {
    return { type: "redirect", target: destPath };
  }

  switch (method) {
    case "mirror":
    case "unpack":
      return { type: "rewrite", target: destPath };
    case "pre_page":
      return {
        type: "pre_page",
        target: `/c/${slug}/pre?vp_dest=${result.destination}`,
      };
    case "redirect":
    default:
      return { type: "redirect", target: destPath };
  }
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `${base || "campanha"}-${suffix}`;
}

export function generateToken(): string {
  return Math.random().toString(36).slice(2, 14) + Date.now().toString(36);
}
