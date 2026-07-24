import type {
  TrafficAnalysisInput,
  TrafficAnalysisResult,
  TrafficShieldConfig,
} from "@/lib/traffic-shield/types";

const SEARCH_ENGINE_PATTERNS = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /yandexbot/i,
  /baiduspider/i,
  /applebot/i,
];

const BAD_BOT_PATTERNS = [
  /bot\b/i,
  /crawler/i,
  /spider/i,
  /scraper/i,
  /curl\//i,
  /wget/i,
  /python-requests/i,
  /httpclient/i,
  /java\//i,
  /libwww/i,
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /ccbot/i,
];

const HEADLESS_PATTERNS = [
  /headless/i,
  /phantomjs/i,
  /puppeteer/i,
  /playwright/i,
  /selenium/i,
  /webdriver/i,
];

const CAMPAIGN_PARAMS = ["fbclid", "gclid", "utm_source", "utm_medium", "utm_campaign"];

function isSearchEngine(ua: string): boolean {
  return SEARCH_ENGINE_PATTERNS.some((p) => p.test(ua));
}

function matchesPatterns(ua: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(ua));
}

function hasCampaignSignal(params?: Record<string, string>): boolean {
  if (!params) return false;
  return CAMPAIGN_PARAMS.some((key) => Boolean(params[key]));
}

function applyMlSensitivity(score: number, sensitivity: number): number {
  const factor = 0.5 + sensitivity * 0.75;
  return Math.min(100, Math.round(score * factor));
}

export function analyzeTraffic(
  input: TrafficAnalysisInput,
  config: TrafficShieldConfig
): TrafficAnalysisResult {
  const reasons: string[] = [];
  let score = 0;
  const ua = input.userAgent ?? "";
  const ip = input.ip ?? "";

  if (!config.enabled) {
    return {
      score: 0,
      action: "allow",
      reasons: ["shield_disabled"],
      category: "human",
    };
  }

  if (ip && config.ipWhitelist.includes(ip)) {
    return {
      score: 0,
      action: "allow",
      reasons: ["ip_whitelist"],
      category: "whitelisted",
    };
  }

  if (ip && config.ipBlacklist.includes(ip)) {
    return {
      score: 100,
      action: "block",
      reasons: ["ip_blacklist"],
      category: "bot",
    };
  }

  if (input.country && config.blockedCountries.includes(input.country)) {
    score += 60;
    reasons.push(`country_blocked:${input.country}`);
  }

  if (
    input.country &&
    config.allowedCountries.length > 0 &&
    !config.allowedCountries.includes(input.country)
  ) {
    score += 50;
    reasons.push(`country_not_allowed:${input.country}`);
  }

  if (!ua.trim()) {
    if (config.blockEmptyUa) {
      score += 55;
      reasons.push("empty_user_agent");
    }
  } else {
    if (config.allowSearchEngines && isSearchEngine(ua)) {
      return {
        score: 0,
        action: "allow",
        reasons: ["search_engine_allowed"],
        category: "human",
      };
    }

    if (config.blockHeadless && matchesPatterns(ua, HEADLESS_PATTERNS)) {
      score += 70;
      reasons.push("headless_browser");
    }

    if (config.blockScrapers && matchesPatterns(ua, BAD_BOT_PATTERNS)) {
      score += 65;
      reasons.push("automated_tool");
    }

    if (config.blockBots && /\bbot\b/i.test(ua) && !isSearchEngine(ua)) {
      score += 50;
      reasons.push("bot_user_agent");
    }
  }

  if (!input.acceptLanguage?.trim()) {
    score += 15;
    reasons.push("missing_accept_language");
  }

  if (!input.accept?.includes("text/html") && input.method === "GET") {
    score += 10;
    reasons.push("atypical_accept_header");
  }

  if (config.protectCampaigns) {
    const fromCampaign = hasCampaignSignal(input.searchParams);
    if (fromCampaign && score > 20) {
      score += 10;
      reasons.push("invalid_campaign_traffic");
    }
    if (!fromCampaign && input.path.startsWith("/loja") && score > 0) {
      score += 5;
      reasons.push("non_campaign_store_access");
    }
  }

  if (input.hasVisitorCookie) {
    score = Math.max(0, score - 25);
    reasons.push("returning_visitor");
  }

  if (hasCampaignSignal(input.searchParams)) {
    score = Math.max(0, score - 20);
    reasons.push("campaign_click_signal");
  }

  score = applyMlSensitivity(score, config.mlSensitivity);

  let action: TrafficAnalysisResult["action"] = "allow";
  let category: TrafficAnalysisResult["category"] = "human";

  if (score >= config.blockThreshold) {
    action = config.hidePricingFromBots ? "safe_page" : "block";
    category = reasons.includes("automated_tool") ? "scraper" : "bot";
  } else if (score >= config.suspiciousThreshold) {
    action = "suspicious";
    category = "suspicious";
  }

  if (config.mode === "monitor") {
    action = action === "block" || action === "safe_page" ? "suspicious" : action;
  }

  if (config.mode === "strict" && score >= config.suspiciousThreshold) {
    action = config.hidePricingFromBots ? "safe_page" : "block";
    category = score >= config.blockThreshold ? "bot" : "suspicious";
  }

  return {
    score,
    action,
    reasons,
    category,
    safePagePath:
      action === "safe_page" ? config.safePagePath : undefined,
  };
}
