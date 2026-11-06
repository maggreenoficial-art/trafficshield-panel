import { createHash } from "node:crypto";
import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export type SiteVisitStats = {
  today: number;
  last7: number;
  last30: number;
  total: number;
};

const EMPTY: SiteVisitStats = { today: 0, last7: 0, last30: 0, total: 0 };

function saoPauloDay(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Meia-noite em São Paulo, em ISO UTC. */
export function saoPauloStartIso(daysAgo = 0) {
  const [year, month, day] = saoPauloDay().split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day - daysAgo, 3, 0, 0)).toISOString();
}

export function siteVisitorKey(ip: string, userAgent: string) {
  const salt = process.env.TRAFFIC_INTERNAL_SECRET?.trim() || "norat-site-visit";
  return createHash("sha256")
    .update(`${salt}|${ip}|${userAgent.slice(0, 180)}`)
    .digest("hex");
}

export async function recordSiteVisit(input: {
  ip: string;
  userAgent: string;
  path?: string;
}) {
  if (!hasAdminClient()) return;
  const supabase = createAdminClient();
  const { error } = await supabase.from("site_visits").insert({
    path: (input.path || "/").slice(0, 200),
    visitor_key: siteVisitorKey(input.ip || "0", input.userAgent || ""),
    visited_on: saoPauloDay(),
  });
  if (error && error.code !== "23505") throw error;
}

async function countSince(since: string | null) {
  const supabase = createAdminClient();
  let query = supabase.from("site_visits").select("id", { count: "exact", head: true });
  if (since) query = query.gte("created_at", since);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getSiteVisitStats(): Promise<SiteVisitStats> {
  if (!hasAdminClient()) return EMPTY;
  try {
    const [today, last7, last30, total] = await Promise.all([
      countSince(saoPauloStartIso(0)),
      countSince(saoPauloStartIso(6)),
      countSince(saoPauloStartIso(29)),
      countSince(null),
    ]);
    return { today, last7, last30, total };
  } catch {
    return EMPTY;
  }
}
