export type OfferMediaType = "all" | "image" | "video";

export type OfferSearchConfig = {
  apiKey: string;
  proxies: string[];
  keywords: string;
  country: string;
  mediaType: OfferMediaType;
};

export type OfferProxyStatus = {
  host: string;
  ok: boolean;
  ip?: string;
  error?: string;
};

export type MetaAd = {
  id: string;
  pageName: string;
  pageId: string | null;
  body: string;
  title: string | null;
  cta: string | null;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean | null;
  imageUrl: string | null;
  videoUrl: string | null;
  snapshotUrl: string;
  linkUrl: string | null;
  platforms: string[];
};

export const emptyOfferConfig = (): OfferSearchConfig => ({
  apiKey: "",
  proxies: [],
  keywords: "",
  country: "BR",
  mediaType: "all",
});

export function maskSecret(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.length <= 4) return "••••";
  return `••••${trimmed.slice(-4)}`;
}
