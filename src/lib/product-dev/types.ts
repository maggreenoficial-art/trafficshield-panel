export type DevDoc = {
  slot: 1 | 2 | 3;
  name: string;
  text: string;
};

export type DevReferenceKind = "image" | "video" | "text" | "site";

export type DevReferencePage = {
  kind?: DevReferenceKind;
  url: string;
  title: string;
  text: string;
};

export type DevCopySection = {
  title: string;
  body: string;
};

export type DevCopy = {
  headline: string;
  subheadline: string;
  sections: DevCopySection[];
  cta: string;
  emailSubject: string;
  emailBody: string;
};

export type DevTake = {
  title: string;
  prompt: string;
  seconds: number;
};

export type DevCreative = {
  kind: "image" | "video";
  title: string;
  prompt: string;
  takes: DevTake[];
};

export type DevSceneTake = {
  title: string;
  prompt: string;
  seconds: number;
};

export type DevScene = {
  title: string;
  prompt: string;
  takes: DevSceneTake[];
};

export type DevChatMessage = {
  role: "user" | "assistant";
  text: string;
  scenes?: DevScene[];
};

export type DevPlan = {
  summary?: string;
  copy?: DevCopy;
  pageHtml?: string;
  creatives?: DevCreative[];
  messages?: DevChatMessage[];
};

export type ProductDevelopment = {
  id: string;
  tenantId: string;
  name: string;
  brief: string;
  docs: DevDoc[];
  referencePages: DevReferencePage[];
  plan: DevPlan | null;
  pageHtml: string;
  storyboardId: string | null;
  publishHostname: string | null;
  publishPath: string;
  status: "draft" | "ready" | "published";
  createdAt: string;
  updatedAt: string;
};
