import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import { envOfferProxies, proxySellerKey } from "@/lib/offers/proxy-seller";
import { parseOfferProxyList, summarizeProxy } from "@/lib/offers/proxy-parse";
import { maskSecret, type OfferMediaType, type OfferSearchConfig } from "@/lib/offers/types";

const BUCKET = "dev-brain";
const PATH = "platform/offer-scrape.json";

function asMedia(value: unknown): OfferMediaType {
  return value === "image" || value === "video" ? value : "all";
}

function fromEnv(): OfferSearchConfig {
  return {
    apiKey: proxySellerKey(),
    proxies: envOfferProxies().map(
      (item) => `${item.host}:${item.port}@${item.username}:${item.password}`
    ),
    keywords: "",
    country: "BR",
    mediaType: "all",
  };
}

function sanitize(input: Partial<OfferSearchConfig>): OfferSearchConfig {
  const proxies = parseOfferProxyList((input.proxies ?? []).join("\n")).map(
    (item) => `${item.host}:${item.port}@${item.username}:${item.password}`
  );
  return {
    apiKey: String(input.apiKey ?? "").trim().slice(0, 120),
    proxies: proxies.slice(0, 200),
    keywords: String(input.keywords ?? "").trim().slice(0, 100),
    country: String(input.country ?? "BR").trim().slice(0, 8) || "BR",
    mediaType: asMedia(input.mediaType),
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

export async function getOfferConfig(): Promise<OfferSearchConfig> {
  const fallback = fromEnv();
  if (!hasAdminClient()) return fallback;
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.from(BUCKET).download(PATH);
  if (error || !data) return fallback;
  try {
    const parsed = sanitize(JSON.parse(await data.text()) as OfferSearchConfig);
    return {
      apiKey: parsed.apiKey || fallback.apiKey,
      proxies: parsed.proxies.length ? parsed.proxies : fallback.proxies,
      keywords: parsed.keywords,
      country: parsed.country || "BR",
      mediaType: parsed.mediaType,
    };
  } catch {
    return fallback;
  }
}

export async function saveOfferConfig(
  input: Partial<OfferSearchConfig>
): Promise<OfferSearchConfig> {
  const current = await getOfferConfig();
  const next = sanitize({
    ...current,
    ...input,
    apiKey:
      input.apiKey !== undefined && String(input.apiKey).trim()
        ? input.apiKey
        : current.apiKey,
    proxies: input.proxies ?? current.proxies,
  });
  if (!hasAdminClient()) return next;
  await ensureBucket();
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(PATH, JSON.stringify(next), {
      contentType: "application/json",
      upsert: true,
    });
  if (error) throw error;
  return next;
}

export function publicOfferConfig(config: OfferSearchConfig) {
  const hosts = parseOfferProxyList(config.proxies.join("\n")).map(summarizeProxy);
  return {
    keywords: config.keywords,
    country: config.country,
    mediaType: config.mediaType,
    hosts,
    proxyCount: hosts.length,
    hasApiKey: Boolean(config.apiKey),
    apiKeyMasked: maskSecret(config.apiKey),
  };
}
