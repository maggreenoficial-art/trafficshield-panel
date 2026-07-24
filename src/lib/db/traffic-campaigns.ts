import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";
import {
  buildCampaignUrl,
  generateSlug,
  generateToken,
} from "@/lib/traffic-shield/campaign-engine";
import {
  normalizeHostname,
  DOMAIN_SLOT_LIMIT,
} from "@/lib/traffic-shield/hostname-utils";
import type {
  CampaignStats,
  CreateCampaignInput,
  DomainStatus,
  TrafficCampaign,
  TrafficCampaignClick,
  TrafficDomain,
} from "@/lib/traffic-shield/campaign-types";
import { normalizeCustomSlug } from "@/lib/traffic-shield/campaign-types";
import { getSiteCampaignHostname } from "@/lib/traffic-shield/site-domain";

type DomainRow = {
  id: string;
  hostname: string;
  label: string | null;
  is_primary: boolean;
  status?: string;
  last_checked_at?: string | null;
  validation_message?: string | null;
  created_at: string;
};

type CampaignRow = {
  id: string;
  name: string;
  slug: string;
  domain_id: string | null;
  traffic_source: string;
  allowed_countries: string[];
  allowed_devices: string[];
  safe_page_url: string;
  offer_page_url: string;
  delivery_method: string;
  offer_delivery_method?: string;
  unique_token_enabled: boolean;
  unique_token: string;
  custom_path_enabled: boolean;
  status: string;
  clicks_offer: number;
  clicks_safe: number;
  created_at: string;
  updated_at: string;
  traffic_domains?: { hostname: string } | null;
};

type ClickRow = {
  id: string;
  campaign_id: string;
  destination: string;
  country: string | null;
  device: string | null;
  traffic_source: string | null;
  ip_hash: string;
  reasons: string[];
  created_at: string;
};

function rowToDomain(row: DomainRow): TrafficDomain {
  return {
    id: row.id,
    hostname: row.hostname,
    label: row.label,
    isPrimary: row.is_primary,
    status: (row.status as DomainStatus) ?? "pending",
    lastCheckedAt: row.last_checked_at ?? null,
    validationMessage: row.validation_message ?? null,
    createdAt: row.created_at,
  };
}

function rowToCampaign(row: CampaignRow): TrafficCampaign {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    domainId: row.domain_id,
    domainHostname: row.traffic_domains?.hostname,
    trafficSource: row.traffic_source as TrafficCampaign["trafficSource"],
    allowedCountries: row.allowed_countries ?? [],
    allowedDevices: (row.allowed_devices ?? [
      "mobile",
      "desktop",
      "tablet",
    ]) as TrafficCampaign["allowedDevices"],
    safePageUrl: row.safe_page_url,
    offerPageUrl: row.offer_page_url,
    deliveryMethod: row.delivery_method as TrafficCampaign["deliveryMethod"],
    offerDeliveryMethod: (row.offer_delivery_method ??
      row.delivery_method ??
      "redirect") as TrafficCampaign["offerDeliveryMethod"],
    uniqueTokenEnabled: row.unique_token_enabled,
    uniqueToken: row.unique_token,
    customPathEnabled: row.custom_path_enabled,
    status: row.status as TrafficCampaign["status"],
    clicksOffer: row.clicks_offer,
    clicksSafe: row.clicks_safe,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToClick(row: ClickRow): TrafficCampaignClick {
  return {
    id: row.id,
    campaignId: row.campaign_id,
    destination: row.destination as TrafficCampaignClick["destination"],
    country: row.country,
    device: row.device,
    trafficSource: row.traffic_source,
    ipHash: row.ip_hash,
    reasons: row.reasons ?? [],
    createdAt: row.created_at,
  };
}

export async function getTrafficDomains(): Promise<TrafficDomain[]> {
  return getTrafficDomainsWithStats();
}

export async function getTrafficDomainsWithStats(): Promise<TrafficDomain[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();

  const [domainsRes, campaignsRes, clicksRes] = await Promise.all([
    supabase.from("traffic_domains").select("*").order("is_primary", { ascending: false }),
    supabase.from("traffic_campaigns").select("id, domain_id, clicks_offer, clicks_safe"),
    supabase
      .from("traffic_campaign_clicks")
      .select("campaign_id, destination, reasons")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const domains = ((domainsRes.data ?? []) as DomainRow[]).map(rowToDomain);
  const campaigns = campaignsRes.data ?? [];
  const clicks = clicksRes.data ?? [];

  return domains.map((domain) => {
    const domainCampaigns = campaigns.filter((c) => c.domain_id === domain.id);
    const campaignIds = new Set(domainCampaigns.map((c) => c.id));

    const domainClicks = clicks.filter((c) => campaignIds.has(c.campaign_id));
    const clicksBots = domainClicks.filter(
      (c) =>
        c.destination === "safe" &&
        (c.reasons ?? []).some(
          (r: string) =>
            r.includes("bot") ||
            r.includes("scraper") ||
            r.includes("headless") ||
            r.includes("automated")
        )
    ).length;

    return {
      ...domain,
      campaignCount: domainCampaigns.length,
      clicksOffer: domainCampaigns.reduce(
        (s, c) => s + (c.clicks_offer ?? 0),
        0
      ),
      clicksSafe: domainCampaigns.reduce(
        (s, c) => s + (c.clicks_safe ?? 0),
        0
      ),
      clicksBots,
    };
  });
}

export async function getDomainSlotInfo(): Promise<{
  used: number;
  limit: number;
}> {
  const domains = await getTrafficDomainsWithStats();
  return { used: domains.length, limit: DOMAIN_SLOT_LIMIT };
}

export async function createTrafficDomain(input: {
  hostname: string;
  label?: string;
  isPrimary?: boolean;
}): Promise<TrafficDomain> {
  const supabase = createAdminClient();
  const { used, limit } = await getDomainSlotInfo();
  if (used >= limit) {
    throw new Error(`Limite de ${limit} domínios atingido.`);
  }

  const hostname = normalizeHostname(input.hostname);

  if (input.isPrimary) {
    await supabase
      .from("traffic_domains")
      .update({ is_primary: false })
      .neq("id", "00000000-0000-0000-0000-000000000000");
  }

  const { data, error } = await supabase
    .from("traffic_domains")
    .insert({
      hostname,
      label: input.label ?? null,
      is_primary: input.isPrimary ?? used === 0,
      status: "pending",
      validation_message: "Configure o CNAME no painel DNS e clique em Validar.",
      last_checked_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;
  return rowToDomain(data as DomainRow);
}

export async function updateTrafficDomainValidation(
  id: string,
  validation: { status: DomainStatus; message: string }
): Promise<TrafficDomain> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("traffic_domains")
    .update({
      status: validation.status,
      validation_message: validation.message,
      last_checked_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .single();

  if (error) throw error;
  return rowToDomain(data as DomainRow);
}

export async function deleteTrafficDomain(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("traffic_domains").delete().eq("id", id);
  if (error) throw error;
}

export async function setPrimaryDomain(id: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("traffic_domains")
    .update({ is_primary: false })
    .neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("traffic_domains").update({ is_primary: true }).eq("id", id);
}

export async function getTrafficCampaigns(): Promise<TrafficCampaign[]> {
  if (!hasAdminClient()) return [];
  const supabase = createAdminClient();

  const [campaignsRes, clicksRes] = await Promise.all([
    supabase
      .from("traffic_campaigns")
      .select("*, traffic_domains(hostname)")
      .order("created_at", { ascending: false }),
    supabase
      .from("traffic_campaign_clicks")
      .select("campaign_id, destination, reasons")
      .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  const clicks = clicksRes.data ?? [];
  const botReason = (reasons: string[]) =>
    reasons.some(
      (r) =>
        r.includes("bot") ||
        r.includes("scraper") ||
        r.includes("headless") ||
        r.includes("automated")
    );

  return ((campaignsRes.data ?? []) as CampaignRow[]).map((row) => {
    const campaign = rowToCampaign(row);
    const campaignClicks = clicks.filter((c) => c.campaign_id === row.id);
    const clicksBots = campaignClicks.filter(
      (c) => c.destination === "safe" && botReason(c.reasons ?? [])
    ).length;
    return { ...campaign, clicksBots };
  });
}

export async function getCampaignBySlug(
  slug: string
): Promise<TrafficCampaign | null> {
  if (!hasAdminClient()) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("traffic_campaigns")
    .select("*, traffic_domains(hostname)")
    .eq("slug", slug)
    .single();
  if (!data) return null;
  return rowToCampaign(data as CampaignRow);
}

export async function getCampaignById(
  id: string
): Promise<TrafficCampaign | null> {
  if (!hasAdminClient()) return null;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("traffic_campaigns")
    .select("*, traffic_domains(hostname)")
    .eq("id", id)
    .single();
  if (!data) return null;
  return rowToCampaign(data as CampaignRow);
}

export async function createTrafficCampaign(
  input: CreateCampaignInput,
  origin: string
): Promise<TrafficCampaign & { campaignUrl: string; urlParams: string }> {
  const supabase = createAdminClient();
  const slug =
    input.customPathEnabled && input.customSlug
      ? normalizeCustomSlug(input.customSlug)
      : generateSlug(input.name);

  const { data, error } = await supabase
    .from("traffic_campaigns")
    .insert({
      name: input.name,
      slug,
      domain_id: input.domainId ?? null,
      traffic_source: input.trafficSource,
      allowed_countries: input.allowedCountries ?? [],
      allowed_devices: input.allowedDevices ?? [],
      safe_page_url: input.safePageUrl,
      offer_page_url: input.offerPageUrl,
      delivery_method:
        input.safeDeliveryMethod ?? input.deliveryMethod ?? "redirect",
      offer_delivery_method: input.offerDeliveryMethod ?? "redirect",
      unique_token_enabled: input.uniqueTokenEnabled ?? true,
      unique_token: generateToken(),
      custom_path_enabled: input.customPathEnabled ?? false,
      status: input.status ?? "draft",
    })
    .select("*, traffic_domains(hostname)")
    .single();

  if (error) throw error;
  const campaign = rowToCampaign(data as CampaignRow);
  const effectiveHostname =
    campaign.domainHostname ??
    (input.useSiteDomain ? getSiteCampaignHostname(origin) ?? undefined : undefined);
  const { url, params } = buildCampaignUrl(
    origin,
    campaign,
    effectiveHostname
  );
  return { ...campaign, campaignUrl: url, urlParams: params };
}

export async function updateTrafficCampaign(
  id: string,
  patch: Partial<CreateCampaignInput> & { status?: TrafficCampaign["status"] }
): Promise<TrafficCampaign> {
  const supabase = createAdminClient();
  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (patch.name) update.name = patch.name;
  if (patch.domainId !== undefined) update.domain_id = patch.domainId;
  if (patch.trafficSource) update.traffic_source = patch.trafficSource;
  if (patch.allowedCountries) update.allowed_countries = patch.allowedCountries;
  if (patch.allowedDevices) update.allowed_devices = patch.allowedDevices;
  if (patch.safePageUrl) update.safe_page_url = patch.safePageUrl;
  if (patch.offerPageUrl) update.offer_page_url = patch.offerPageUrl;
  if (patch.safeDeliveryMethod ?? patch.deliveryMethod) {
    update.delivery_method =
      patch.safeDeliveryMethod ?? patch.deliveryMethod;
  }
  if (patch.offerDeliveryMethod) {
    update.offer_delivery_method = patch.offerDeliveryMethod;
  }
  if (patch.uniqueTokenEnabled !== undefined)
    update.unique_token_enabled = patch.uniqueTokenEnabled;
  if (patch.customPathEnabled !== undefined)
    update.custom_path_enabled = patch.customPathEnabled;
  if (patch.status) update.status = patch.status;

  const { data, error } = await supabase
    .from("traffic_campaigns")
    .update(update)
    .eq("id", id)
    .select("*, traffic_domains(hostname)")
    .single();
  if (error) throw error;
  return rowToCampaign(data as CampaignRow);
}

export async function deleteTrafficCampaign(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("traffic_campaigns")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function logCampaignClick(input: {
  campaignId: string;
  destination: "offer" | "safe";
  country?: string;
  device?: string;
  trafficSource?: string;
  ipHash: string;
  reasons: string[];
}): Promise<void> {
  if (!hasAdminClient()) return;
  const supabase = createAdminClient();

  await supabase.from("traffic_campaign_clicks").insert({
    campaign_id: input.campaignId,
    destination: input.destination,
    country: input.country ?? null,
    device: input.device ?? null,
    traffic_source: input.trafficSource ?? null,
    ip_hash: input.ipHash,
    reasons: input.reasons,
  });

  const field = input.destination === "offer" ? "clicks_offer" : "clicks_safe";
  const { data: current } = await supabase
    .from("traffic_campaigns")
    .select(field)
    .eq("id", input.campaignId)
    .single();

  if (current) {
    await supabase
      .from("traffic_campaigns")
      .update({
        [field]: (Number(current[field as keyof typeof current]) || 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.campaignId);
  }
}

function isBotClick(reasons: string[]): boolean {
  return reasons.some(
    (r) =>
      r.includes("bot") ||
      r.includes("scraper") ||
      r.includes("headless") ||
      r.includes("automated")
  );
}

export async function getCampaignStats(
  campaignId: string
): Promise<CampaignStats> {
  const empty: CampaignStats = {
    campaignId,
    clicksOffer: 0,
    clicksSafe: 0,
    clicksBots: 0,
    totalRequests: 0,
    passRate: 0,
    hourly: [],
    recentClicks: [],
  };
  if (!hasAdminClient()) return empty;

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [campaignRes, clicksRes] = await Promise.all([
    supabase
      .from("traffic_campaigns")
      .select("clicks_offer, clicks_safe")
      .eq("id", campaignId)
      .single(),
    supabase
      .from("traffic_campaign_clicks")
      .select("*")
      .eq("campaign_id", campaignId)
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const campaign = campaignRes.data;
  const clicks = ((clicksRes.data ?? []) as ClickRow[]).map(rowToClick);
  const clicksOffer = campaign?.clicks_offer ?? 0;
  const clicksSafe = campaign?.clicks_safe ?? 0;
  const clicksBots = clicks.filter(
    (c) => c.destination === "safe" && isBotClick(c.reasons)
  ).length;
  const totalRequests = clicksOffer + clicksSafe;

  const hourlyMap = new Map<
    string,
    { offer: number; safe: number; bots: number }
  >();
  for (const click of clicks) {
    const hour = new Date(click.createdAt).toISOString().slice(11, 13) + "h";
    const bucket = hourlyMap.get(hour) ?? { offer: 0, safe: 0, bots: 0 };
    if (click.destination === "offer") bucket.offer++;
    else bucket.safe++;
    if (isBotClick(click.reasons)) bucket.bots++;
    hourlyMap.set(hour, bucket);
  }

  return {
    campaignId,
    clicksOffer,
    clicksSafe,
    clicksBots,
    totalRequests,
    passRate:
      totalRequests > 0
        ? Math.round((clicksOffer / totalRequests) * 1000) / 10
        : 0,
    hourly: [...hourlyMap.entries()]
      .map(([hour, counts]) => ({ hour, ...counts }))
      .sort((a, b) => a.hour.localeCompare(b.hour)),
    recentClicks: clicks.slice(0, 30),
  };
}
