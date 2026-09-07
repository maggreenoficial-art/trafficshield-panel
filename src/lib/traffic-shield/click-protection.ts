/** Rate-limit e anti-replay para rotas /c/* */

import { checkRateLimit } from "@/lib/security/rate-limit";
import type { TrafficSource } from "@/lib/traffic-shield/campaign-types";

type ReplayEntry = {
  count: number;
  ips: Set<string>;
  resetAt: number;
};

const globalStore = globalThis as typeof globalThis & {
  __noratClickReplay?: Map<string, ReplayEntry>;
};

function replayStore(): Map<string, ReplayEntry> {
  if (!globalStore.__noratClickReplay) {
    globalStore.__noratClickReplay = new Map();
  }
  return globalStore.__noratClickReplay;
}

const CLICK_ID_KEYS: Partial<Record<TrafficSource, string[]>> = {
  meta: ["fbclid"],
  google: ["gclid", "wbraid", "gbraid"],
  tiktok: ["ttclid"],
  taboola: ["tblci"],
  newsbreak: ["nbclid"],
};

export function extractPlatformClickId(
  source: TrafficSource,
  params: Record<string, string>
): string | null {
  const keys = CLICK_ID_KEYS[source] ?? [];
  for (const key of keys) {
    const value = params[key]?.trim();
    if (value) return `${key}:${value.slice(0, 120)}`;
  }
  return null;
}

/**
 * Avalia abuso: rate por IP e replay do mesmo click id / token.
 * Quando ok=false, o cloaker deve forçar página segura.
 */
export function assessCampaignAbuse(input: {
  campaignId: string;
  ipHash: string;
  token?: string | null;
  source: TrafficSource;
  params: Record<string, string>;
}): { ok: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const { campaignId, ipHash, source, params } = input;

  const ipLimit = checkRateLimit(
    `camp:ip:${campaignId}:${ipHash}`,
    40,
    60_000
  );
  if (!ipLimit.ok) {
    reasons.push("rate_limit_ip");
  }

  const token = input.token?.trim();
  if (token) {
    const tokenLimit = checkRateLimit(
      `camp:tok:${campaignId}:${token}:${ipHash}`,
      25,
      60_000
    );
    if (!tokenLimit.ok) {
      reasons.push("rate_limit_token");
    }
  }

  const clickId = extractPlatformClickId(source, params);
  if (clickId) {
    const replay = trackReplay(
      `camp:click:${campaignId}:${clickId}`,
      ipHash,
      24 * 60 * 60 * 1000,
      4,
      3
    );
    if (!replay.ok) {
      reasons.push(replay.reason ?? "click_replay");
    }
  } else if (token) {
    // Link com token mas sem click id de plataforma — limita replay de spy
    const stolen = trackReplay(
      `camp:stolen:${campaignId}:${token}:${ipHash}`,
      ipHash,
      60 * 60 * 1000,
      8,
      1
    );
    if (!stolen.ok) {
      reasons.push("token_replay");
    }
  }

  return { ok: reasons.length === 0, reasons };
}

function trackReplay(
  key: string,
  ipHash: string,
  windowMs: number,
  maxHits: number,
  maxDistinctIps: number
): { ok: boolean; reason?: string } {
  const now = Date.now();
  const store = replayStore();
  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, ips: new Set(), resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count += 1;
  entry.ips.add(ipHash);

  if (entry.count > maxHits) {
    return { ok: false, reason: "click_id_exhausted" };
  }
  if (entry.ips.size > maxDistinctIps) {
    return { ok: false, reason: "click_id_shared" };
  }
  return { ok: true };
}
