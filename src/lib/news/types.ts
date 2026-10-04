export type NewsItem = {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string | null;
  summary: string;
  imageUrl: string | null;
  videoUrl: string | null;
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
