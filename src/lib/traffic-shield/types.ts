export type TrafficShieldMode = "monitor" | "protect" | "strict";

export type TrafficAction = "allow" | "suspicious" | "block" | "safe_page";

export interface TrafficShieldConfig {
  enabled: boolean;
  mode: TrafficShieldMode;
  blockBots: boolean;
  blockScrapers: boolean;
  blockHeadless: boolean;
  blockEmptyUa: boolean;
  allowSearchEngines: boolean;
  protectCampaigns: boolean;
  hidePricingFromBots: boolean;
  blockThreshold: number;
  suspiciousThreshold: number;
  safePagePath: string;
  allowedCountries: string[];
  blockedCountries: string[];
  ipWhitelist: string[];
  ipBlacklist: string[];
  mlSensitivity: number;
  updatedAt?: string;
}

export interface TrafficAnalysisInput {
  ip?: string;
  userAgent?: string;
  path: string;
  method: string;
  referer?: string;
  acceptLanguage?: string;
  accept?: string;
  country?: string;
  searchParams?: Record<string, string>;
  hasVisitorCookie?: boolean;
}

export interface TrafficAnalysisResult {
  score: number;
  action: TrafficAction;
  reasons: string[];
  category: "human" | "bot" | "scraper" | "suspicious" | "whitelisted";
  safePagePath?: string;
}

export interface TrafficLogEntry {
  id: string;
  ipHash: string;
  userAgent: string | null;
  path: string;
  action: TrafficAction;
  score: number;
  reasons: string[];
  category: string;
  country: string | null;
  createdAt: string;
}

export interface TrafficShieldStats {
  total24h: number;
  allowed24h: number;
  blocked24h: number;
  suspicious24h: number;
  passRate: number;
  botsBlocked24h: number;
  topReasons: { reason: string; count: number }[];
  hourly: { hour: string; allowed: number; blocked: number; suspicious: number }[];
  recentLogs: TrafficLogEntry[];
}
