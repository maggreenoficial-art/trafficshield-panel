import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { parseOfferProxyList, summarizeProxy } from "@/lib/offers/proxy-parse";
import type { ReportAttempt, ReportChannel, ReportLog } from "@/lib/reports/channels";
import type { ReportBatch, ReportPersona } from "@/lib/reports/identities";

export type { ReportLog } from "@/lib/reports/channels";

export type ReportConfig = {
  proxies: string[];
  reporterName: string;
  reporterEmail: string;
};

const BUCKET = "dev-brain";
const CONFIG_PATH = "platform/reports-config.json";
const LOG_PATH = "platform/reports-log.json";
const BATCH_PATH = "platform/reports-batch.json";

function emptyConfig(): ReportConfig {
  return { proxies: [], reporterName: "", reporterEmail: "" };
}

function sanitizeConfig(input: Partial<ReportConfig>): ReportConfig {
  const proxies = parseOfferProxyList((input.proxies ?? []).join("\n")).map(
    (item) => `${item.host}:${item.port}@${item.username}:${item.password}`
  );
  return {
    proxies: proxies.slice(0, 1000),
    reporterName: String(input.reporterName ?? "").trim().slice(0, 80),
    reporterEmail: String(input.reporterEmail ?? "").trim().slice(0, 120),
  };
}

async function ensureBucket() {
  const supabase = createAdminClient();
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: 8 * 1024 * 1024,
  });
  if (error && !/already exists/i.test(error.message)) throw error;
}

async function readJson<T>(path: string): Promise<T | null> {
  if (!hasAdminClient()) return null;
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as T;
  } catch {
    return null;
  }
}

export async function getReportConfig(): Promise<ReportConfig> {
  const parsed = await readJson<Partial<ReportConfig>>(CONFIG_PATH);
  return parsed ? sanitizeConfig(parsed) : emptyConfig();
}

export async function saveReportConfig(input: Partial<ReportConfig>): Promise<ReportConfig> {
  const current = await getReportConfig();
  const next = sanitizeConfig({
    proxies: input.proxies ?? current.proxies,
    reporterName: input.reporterName ?? current.reporterName,
    reporterEmail: input.reporterEmail ?? current.reporterEmail,
  });
  if (!hasAdminClient()) return next;
  await ensureBucket();
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(CONFIG_PATH, JSON.stringify(next), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
  return next;
}

export function publicReportConfig(config: ReportConfig) {
  const hosts = parseOfferProxyList(config.proxies.join("\n")).map(summarizeProxy);
  return {
    hosts,
    proxyCount: hosts.length,
    reporterName: config.reporterName,
    reporterEmail: config.reporterEmail,
  };
}

function asLog(value: unknown): ReportLog | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const url = typeof rec.url === "string" ? rec.url.trim() : "";
  if (!url) return null;
  const results = Array.isArray(rec.results)
    ? rec.results.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const row = item as ReportAttempt;
        const channel = row.channel;
        if (channel !== "google" && channel !== "cloudflare" && channel !== "vercel") return [];
        return [
          {
            channel,
            ok: Boolean(row.ok),
            status: typeof row.status === "number" ? row.status : null,
            detail: String(row.detail ?? "").slice(0, 180),
            proxy: String(row.proxy ?? "").slice(0, 80),
          },
        ];
      })
    : [];
  return {
    id: typeof rec.id === "string" ? rec.id.slice(0, 40) : crypto.randomUUID(),
    url: url.slice(0, 300),
    note: typeof rec.note === "string" ? rec.note.slice(0, 500) : "",
    createdAt: typeof rec.createdAt === "string" ? rec.createdAt : new Date().toISOString(),
    results,
  };
}

export async function listReportLogs(): Promise<ReportLog[]> {
  const parsed = await readJson<{ logs?: unknown }>(LOG_PATH);
  return (Array.isArray(parsed?.logs) ? parsed.logs : [])
    .map(asLog)
    .filter((item): item is ReportLog => Boolean(item))
    .slice(0, 1000);
}

export async function appendReportLogs(
  entries: Array<{ url: string; note: string; results: ReportAttempt[] }>
): Promise<ReportLog[]> {
  const current = await listReportLogs();
  const next: ReportLog[] = [
    ...entries.map((entry) => ({
      id: crypto.randomUUID(),
      url: entry.url,
      note: entry.note,
      createdAt: new Date().toISOString(),
      results: entry.results,
    })),
    ...current,
  ].slice(0, 1000);
  if (!hasAdminClient()) return next;
  await ensureBucket();
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(
    LOG_PATH,
    JSON.stringify({ logs: next }),
    { contentType: "application/json", upsert: true }
  );
  if (error) throw error;
  return next;
}

function asPersona(value: unknown): ReportPersona | null {
  if (!value || typeof value !== "object") return null;
  const rec = value as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim().slice(0, 80) : "";
  const email = typeof rec.email === "string" ? rec.email.trim().toLowerCase().slice(0, 80) : "";
  const steps = typeof rec.steps === "string" ? rec.steps.trim().slice(0, 900) : "";
  if (!name || !email || steps.length < 15) return null;
  return { name, email, steps };
}

let memoryBatch: ReportBatch | null = null;

export async function getReportBatch(): Promise<ReportBatch | null> {
  const parsed = await readJson<Partial<ReportBatch>>(BATCH_PATH);
  if (!parsed || typeof parsed.key !== "string") return memoryBatch;
  const personas = (Array.isArray(parsed.personas) ? parsed.personas : [])
    .map(asPersona)
    .filter((item): item is ReportPersona => Boolean(item))
    .slice(0, 1000);
  const sent = typeof parsed.sent === "number" && parsed.sent > 0 ? Math.floor(parsed.sent) : 0;
  memoryBatch = { key: parsed.key.slice(0, 2000), personas, sent: Math.min(sent, personas.length) };
  return memoryBatch;
}

export async function saveReportBatch(batch: ReportBatch): Promise<void> {
  memoryBatch = batch;
  if (!hasAdminClient()) return;
  await ensureBucket();
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).upload(BATCH_PATH, JSON.stringify(batch), {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw error;
}

export function isReportChannel(value: string): value is ReportChannel {
  return value === "google" || value === "cloudflare" || value === "vercel";
}
