import type { TrafficShieldConfig } from "@/lib/traffic-shield/types";

export const TRAFFIC_CONFIG_KEY = "traffic_shield";

export function getDefaultTrafficConfig(): TrafficShieldConfig {
  return {
    enabled: process.env.TRAFFIC_SHIELD_ENABLED === "true",
    mode: (process.env.TRAFFIC_SHIELD_MODE as TrafficShieldConfig["mode"]) ?? "protect",
    blockBots: true,
    blockScrapers: true,
    blockHeadless: true,
    blockEmptyUa: true,
    allowSearchEngines: true,
    protectCampaigns: true,
    hidePricingFromBots: true,
    blockThreshold: 75,
    suspiciousThreshold: 45,
    safePagePath: "/bem-estar",
    allowedCountries: [],
    blockedCountries: [],
    ipWhitelist: [],
    ipBlacklist: [],
    mlSensitivity: 0.7,
  };
}

export function mergeTrafficConfig(
  partial?: Partial<TrafficShieldConfig> | null
): TrafficShieldConfig {
  return { ...getDefaultTrafficConfig(), ...partial };
}
