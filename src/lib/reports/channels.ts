export const REPORT_CHANNELS = ["google", "cloudflare", "vercel"] as const;

export type ReportChannel = (typeof REPORT_CHANNELS)[number];

export const REPORT_CHANNEL_LABEL: Record<ReportChannel, string> = {
  google: "Google",
  cloudflare: "Cloudflare",
  vercel: "Vercel",
};

export type ReportAttempt = {
  channel: ReportChannel;
  ok: boolean;
  status: number | null;
  detail: string;
  proxy: string;
};

export type ReportLog = {
  id: string;
  url: string;
  note: string;
  createdAt: string;
  results: ReportAttempt[];
};
