export type TrafficSource =
  | "meta"
  | "google"
  | "tiktok"
  | "taboola"
  | "newsbreak"
  | "mgid"
  | "rumble"
  | "native"
  | "other";

export type DeliveryMethod =
  | "redirect"
  | "pre_page"
  | "mirror"
  | "unpack";

export type CampaignStatus = "draft" | "active" | "paused";

export type DeviceType = "mobile" | "desktop" | "tablet";

export type CampaignDestination = "offer" | "safe";

export type DomainStatus = "pending" | "valid" | "invalid";

export interface TrafficDomain {
  id: string;
  hostname: string;
  label: string | null;
  isPrimary: boolean;
  status: DomainStatus;
  lastCheckedAt: string | null;
  validationMessage: string | null;
  createdAt: string;
  campaignCount?: number;
  clicksOffer?: number;
  clicksSafe?: number;
  clicksBots?: number;
}

export interface TrafficCampaign {
  id: string;
  name: string;
  slug: string;
  domainId: string | null;
  domainHostname?: string;
  trafficSource: TrafficSource;
  allowedCountries: string[];
  allowedDevices: DeviceType[];
  safePageUrl: string;
  offerPageUrl: string;
  /** Método de entrega da página segura */
  deliveryMethod: DeliveryMethod;
  /** Método de entrega da página de oferta */
  offerDeliveryMethod: DeliveryMethod;
  uniqueTokenEnabled: boolean;
  uniqueToken: string;
  customPathEnabled: boolean;
  status: CampaignStatus;
  clicksOffer: number;
  clicksSafe: number;
  clicksBots?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TrafficCampaignClick {
  id: string;
  campaignId: string;
  destination: CampaignDestination;
  country: string | null;
  device: string | null;
  trafficSource: string | null;
  ipHash: string;
  reasons: string[];
  createdAt: string;
}

export interface CreateCampaignInput {
  name: string;
  /** Usa o domínio fixo da loja (NEXT_PUBLIC_SITE_URL / hospedagem atual). */
  useSiteDomain?: boolean;
  domainId?: string;
  trafficSource: TrafficSource;
  allowedCountries?: string[];
  allowedDevices?: DeviceType[];
  safePageUrl: string;
  offerPageUrl: string;
  /** @deprecated use safeDeliveryMethod */
  deliveryMethod?: DeliveryMethod;
  safeDeliveryMethod?: DeliveryMethod;
  offerDeliveryMethod?: DeliveryMethod;
  uniqueTokenEnabled?: boolean;
  customPathEnabled?: boolean;
  customSlug?: string;
  status?: CampaignStatus;
}

export interface CampaignEvaluationResult {
  destination: CampaignDestination;
  reasons: string[];
  score: number;
  deliveryMethod: DeliveryMethod;
  safePageUrl: string;
  offerPageUrl: string;
  campaignId: string;
  campaignSlug: string;
}

export interface CampaignStats {
  campaignId: string;
  clicksOffer: number;
  clicksSafe: number;
  clicksBots: number;
  totalRequests: number;
  passRate: number;
  hourly: { hour: string; offer: number; safe: number; bots: number }[];
  recentClicks: TrafficCampaignClick[];
}

export const TRAFFIC_SOURCES: {
  id: TrafficSource;
  label: string;
  shortLabel: string;
  params: string;
  color: string;
  /** Plataforma tem campo separado para parâmetros de URL */
  separateParamsField: boolean;
  paramsFieldLabel?: string;
}[] = [
  {
    id: "meta",
    label: "Meta Ads (Facebook / Instagram)",
    shortLabel: "Facebook",
    params: "fbclid",
    color: "#1877F2",
    separateParamsField: true,
    paramsFieldLabel: "Parâmetros de URL",
  },
  {
    id: "google",
    label: "Google Ads",
    shortLabel: "Google",
    params: "gclid",
    color: "#EA4335",
    separateParamsField: true,
    paramsFieldLabel: "Modelo de acompanhamento",
  },
  {
    id: "tiktok",
    label: "TikTok Ads",
    shortLabel: "TikTok",
    params: "ttclid",
    color: "#FE2C55",
    separateParamsField: true,
    paramsFieldLabel: "Parâmetros de URL",
  },
  {
    id: "taboola",
    label: "Taboola",
    shortLabel: "Taboola",
    params: "utm_source=taboola",
    color: "#2B6AFF",
    separateParamsField: false,
  },
  {
    id: "newsbreak",
    label: "NewsBreak",
    shortLabel: "NewsBreak",
    params: "utm_source=newsbreak",
    color: "#FF3B30",
    separateParamsField: false,
  },
  {
    id: "mgid",
    label: "MGID",
    shortLabel: "MGID",
    params: "utm_source=mgid",
    color: "#00B956",
    separateParamsField: false,
  },
  {
    id: "rumble",
    label: "Rumble",
    shortLabel: "Rumble",
    params: "utm_source=rumble",
    color: "#85C742",
    separateParamsField: false,
  },
  {
    id: "native",
    label: "Native / Outbrain",
    shortLabel: "Native",
    params: "utm_source",
    color: "#8B5CF6",
    separateParamsField: false,
  },
  {
    id: "other",
    label: "Outra fonte",
    shortLabel: "Outra",
    params: "utm_source",
    color: "#6B7280",
    separateParamsField: false,
  },
];

export const DELIVERY_METHOD_GUIDE: {
  id: DeliveryMethod;
  label: string;
  howItWorks: string;
  whenToUse: string;
  forSafe: boolean;
  forOffer: boolean;
  badge?: string;
}[] = [
  {
    id: "redirect",
    label: "TWR Redirect",
    howItWorks: "Redirecionamento padrão de uma URL para outra",
    whenToUse:
      "Mais compatível, funciona com qualquer tipo de página. É o mais usado.",
    forSafe: true,
    forOffer: true,
    badge: "Padrão",
  },
  {
    id: "pre_page",
    label: "Pre Page",
    howItWorks: "Exibe uma pré-página otimizada antes do redirecionamento",
    whenToUse: "Para melhorar métricas de CPM",
    forSafe: true,
    forOffer: false,
  },
  {
    id: "mirror",
    label: "TWR Mirror",
    howItWorks:
      "Espelha o conteúdo da página na própria URL do TWR, sem redirecionamento",
    whenToUse:
      "Mais seguro contra espionagem — o espião só vê a URL do domínio no TWR, nunca a URL real da oferta",
    forSafe: true,
    forOffer: true,
  },
  {
    id: "unpack",
    label: "Unpack",
    howItWorks:
      "Redireciona por um arquivo PHP instalado na sua hospedagem",
    whenToUse:
      "Quando a página segura e a de oferta estão na mesma hospedagem",
    forSafe: true,
    forOffer: true,
  },
];

export const DELIVERY_METHODS = DELIVERY_METHOD_GUIDE.filter((m) => m.forSafe).map(
  (m) => ({
    id: m.id,
    label: m.label.replace("TWR ", ""),
    desc: m.howItWorks,
    badge: m.badge,
  })
);

export type OfferType = "single" | "ab_storm";

export const OFFER_DELIVERY_METHODS = DELIVERY_METHOD_GUIDE.filter(
  (m) => m.forOffer
).map((m) => ({
  id: m.id,
  label: m.label.replace("TWR ", ""),
  desc: m.howItWorks,
  badge: m.badge,
}));

export const SAFE_DELIVERY_METHODS = DELIVERY_METHODS;

export const OFFER_TYPE_OPTIONS: {
  id: OfferType;
  label: string;
  desc: string;
  disabled?: boolean;
}[] = [
  {
    id: "single",
    label: "Single Offer",
    desc: "Uma única página de oferta para todo o tráfego qualificado.",
  },
  {
    id: "ab_storm",
    label: "A/B Storm",
    desc: "Testes A/B entre múltiplas ofertas (em breve).",
    disabled: true,
  },
];

export const SAFE_PAGE_SUGGESTIONS = [
  {
    path: "/bem-estar",
    label: "Bem-estar",
    desc: "Conteúdo neutro e dentro das políticas",
  },
  {
    path: "/",
    label: "Página inicial",
    desc: "Home da loja — congruente com e-commerce",
  },
  {
    path: "/guias",
    label: "Guias",
    desc: "Conteúdo educativo sem oferta direta",
  },
];

export const COUNTRY_OPTIONS = [
  { code: "BR", label: "Brasil" },
  { code: "US", label: "Estados Unidos" },
  { code: "PT", label: "Portugal" },
  { code: "AR", label: "Argentina" },
  { code: "MX", label: "México" },
  { code: "CO", label: "Colômbia" },
  { code: "CL", label: "Chile" },
  { code: "PE", label: "Peru" },
  { code: "UY", label: "Uruguai" },
  { code: "PY", label: "Paraguai" },
];

export const DEVICE_OPTIONS: { id: DeviceType; label: string }[] = [
  { id: "mobile", label: "Mobile" },
  { id: "desktop", label: "Desktop" },
  { id: "tablet", label: "Tablet" },
];

/** Lista vazia = todos permitidos (sem restrição). */
export function deviceSelectionFromAllowed(
  devices: DeviceType[] | undefined
): "all" | DeviceType {
  if (!devices || devices.length === 0) return "all";
  if (devices.length === 1) return devices[0];
  return "all";
}

export function countrySelectionFromAllowed(
  countries: string[] | undefined
): "all" | string {
  if (!countries || countries.length === 0) return "all";
  if (countries.length === 1) return countries[0];
  return "all";
}

export function allowedDevicesFromSelection(
  selection: "all" | DeviceType
): DeviceType[] {
  return selection === "all" ? [] : [selection];
}

export function allowedCountriesFromSelection(
  selection: "all" | string
): string[] {
  return selection === "all" ? [] : [selection];
}

const SOURCE_DELIVERY_DEFAULTS: Partial<
  Record<
    TrafficSource,
    { safe: DeliveryMethod; offer: DeliveryMethod }
  >
> = {
  meta: { safe: "redirect", offer: "redirect" },
  google: { safe: "redirect", offer: "redirect" },
  tiktok: { safe: "redirect", offer: "redirect" },
  taboola: { safe: "pre_page", offer: "redirect" },
  newsbreak: { safe: "pre_page", offer: "redirect" },
  native: { safe: "pre_page", offer: "redirect" },
  mgid: { safe: "pre_page", offer: "redirect" },
  rumble: { safe: "redirect", offer: "redirect" },
  other: { safe: "redirect", offer: "redirect" },
};

export function getDefaultDeliveryMethodsForSource(source: TrafficSource): {
  safe: DeliveryMethod;
  offer: DeliveryMethod;
} {
  return SOURCE_DELIVERY_DEFAULTS[source] ?? {
    safe: "redirect",
    offer: "redirect",
  };
}

export function normalizeCustomSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/^\/+/, "")
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidCustomSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length >= 2;
}

export function buildFullCampaignUrl(
  campaignUrl: string,
  urlParams: string
): string {
  if (!urlParams) return campaignUrl;
  const joiner = campaignUrl.includes("?") ? "&" : "?";
  return `${campaignUrl}${joiner}${urlParams}`;
}

export function getTrafficSourceConfig(source: TrafficSource) {
  return (
    TRAFFIC_SOURCES.find((s) => s.id === source) ??
    TRAFFIC_SOURCES.find((s) => s.id === "other")!
  );
}
