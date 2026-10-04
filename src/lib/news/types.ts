export type NewsKind = "news" | "youtube" | "instagram";

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
};

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
