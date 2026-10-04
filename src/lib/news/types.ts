export type NewsKind = "news" | "youtube" | "instagram";
export type NewsMediaKind = "image" | "video" | "text";

export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  imageUrl: string | null;
  videoUrl: string | null;
  kind?: NewsKind;
  mediaKind?: Exclude<NewsMediaKind, "text">;
};

export function newsMediaKind(item: NewsItem): NewsMediaKind {
  if (item.mediaKind) return item.mediaKind;
  if (item.videoUrl) return "video";
  if (item.imageUrl) return "image";
  return "text";
}

export type NewsBrand = {
  logoUrl: string | null;
  mockupUrl: string | null;
};

export type NewsDraft = {
  news: NewsItem;
  headline: string;
  caption: string;
  imagePrompt: string;
};
