import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import {
  getDefaultTrafficConfig,
  mergeTrafficConfig,
  TRAFFIC_CONFIG_KEY,
} from "@/lib/traffic-shield/config";
import type {
  TrafficAction,
  TrafficLogEntry,
  TrafficShieldConfig,
  TrafficShieldStats,
} from "@/lib/traffic-shield/types";

type LogRow = {
  id: string;
  ip_hash: string;
  user_agent: string | null;
  path: string;
  action: string;
  score: number;
  reasons: string[];
  category: string;
  country: string | null;
  created_at: string;
};

function rowToLog(row: LogRow): TrafficLogEntry {
  return {
    id: row.id,
    ipHash: row.ip_hash,
    userAgent: row.user_agent,
    path: row.path,
    action: row.action as TrafficAction,
    score: row.score,
    reasons: row.reasons ?? [],
    category: row.category,
    country: row.country,
    createdAt: row.created_at,
  };
}

export async function getTrafficConfig(): Promise<TrafficShieldConfig> {
  if (!hasAdminClient()) return getDefaultTrafficConfig();

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("app_config")
    .select("value, updated_at")
    .eq("key", TRAFFIC_CONFIG_KEY)
    .single();

  const value = data?.value as Partial<TrafficShieldConfig> | null;
  return mergeTrafficConfig({
    ...value,
    updatedAt: data?.updated_at ?? undefined,
  });
}

export async function saveTrafficConfig(
  config: TrafficShieldConfig
): Promise<TrafficShieldConfig> {
  const supabase = createAdminClient();
  const payload = {
    ...config,
    updatedAt: new Date().toISOString(),
  };

  const { error } = await supabase.from("app_config").upsert({
    key: TRAFFIC_CONFIG_KEY,
    value: payload,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
  return payload;
}

export async function logTrafficEvent(input: {
  ipHash: string;
  userAgent?: string;
  path: string;
  action: TrafficAction;
  score: number;
  reasons: string[];
  category: string;
  country?: string;
}): Promise<void> {
  if (!hasAdminClient()) return;

  const supabase = createAdminClient();
  await supabase.from("traffic_logs").insert({
    ip_hash: input.ipHash,
    user_agent: input.userAgent?.slice(0, 500) ?? null,
    path: input.path.slice(0, 500),
    action: input.action,
    score: input.score,
    reasons: input.reasons,
    category: input.category,
    country: input.country ?? null,
  });
}

export async function getTrafficStats(): Promise<TrafficShieldStats> {
  const empty: TrafficShieldStats = {
    total24h: 0,
    allowed24h: 0,
    blocked24h: 0,
    suspicious24h: 0,
    passRate: 99.9,
    botsBlocked24h: 0,
    topReasons: [],
    hourly: [],
    recentLogs: [],
  };

  if (!hasAdminClient()) return empty;

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: logs } = await supabase
    .from("traffic_logs")
    .select("*")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(2000);

  const rows = (logs ?? []) as LogRow[];
  if (rows.length === 0) return empty;

  const allowed24h = rows.filter((r) => r.action === "allow").length;
  const blocked24h = rows.filter(
    (r) => r.action === "block" || r.action === "safe_page"
  ).length;
  const suspicious24h = rows.filter((r) => r.action === "suspicious").length;
  const total24h = rows.length;
  const passRate =
    total24h > 0 ? Math.round((allowed24h / total24h) * 1000) / 10 : 99.9;

  const reasonCounts = new Map<string, number>();
  for (const row of rows) {
    for (const reason of row.reasons ?? []) {
      reasonCounts.set(reason, (reasonCounts.get(reason) ?? 0) + 1);
    }
  }

  const topReasons = [...reasonCounts.entries()]
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const hourlyMap = new Map<
    string,
    { allowed: number; blocked: number; suspicious: number }
  >();

  for (const row of rows) {
    const hour = new Date(row.created_at).toISOString().slice(11, 13) + "h";
    const bucket = hourlyMap.get(hour) ?? {
      allowed: 0,
      blocked: 0,
      suspicious: 0,
    };
    if (row.action === "allow") bucket.allowed++;
    else if (row.action === "suspicious") bucket.suspicious++;
    else bucket.blocked++;
    hourlyMap.set(hour, bucket);
  }

  const hourly = [...hourlyMap.entries()]
    .map(([hour, counts]) => ({ hour, ...counts }))
    .sort((a, b) => a.hour.localeCompare(b.hour));

  return {
    total24h,
    allowed24h,
    blocked24h,
    suspicious24h,
    passRate,
    botsBlocked24h: rows.filter(
      (r) =>
        (r.action === "block" || r.action === "safe_page") &&
        (r.category === "bot" || r.category === "scraper")
    ).length,
    topReasons,
    hourly,
    recentLogs: rows.slice(0, 50).map(rowToLog),
  };
}

export async function getTrafficLogs(limit = 100): Promise<TrafficLogEntry[]> {
  if (!hasAdminClient()) return [];

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("traffic_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  return ((data ?? []) as LogRow[]).map(rowToLog);
}
