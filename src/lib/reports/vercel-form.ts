import { isBlockedReportHost } from "@/lib/reports/urls";

export const VERCEL_ABUSE_TYPE = "Phishing";
export const VERCEL_SCREENSHOT_LIMIT = 5;
export const VERCEL_FILE_BYTES = 4 * 1024 * 1024;
export const VERCEL_COMBINED_BYTES = 2 * 1024 * 1024;

const IMAGE_TYPES = new Set(["image/gif", "image/jpg", "image/jpeg", "image/png"]);

export type VercelPhishingInput = {
  name: string;
  email: string;
  infringingUrl: string;
  realContentUrl: string;
  forwardToOwner: boolean;
  includeContact: boolean;
  impacted: boolean;
  steps: string;
};

export function normalizeVercelUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  if (/\s/.test(withScheme)) return withScheme;
  try {
    return new URL(withScheme).href;
  } catch {
    return withScheme;
  }
}

export function vercelUrlIssue(raw: string) {
  const value = normalizeVercelUrl(raw);
  if (!value) return "Insira um URL válido.";
  if (/\s/.test(value)) return "O URL não pode ter espaços.";
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return "Insira um URL válido.";
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return "Insira um URL válido.";
  if (isBlockedReportHost(url.hostname)) return "Esse endereço não pode ser denunciado daqui.";
  if (!/\w\.\w/.test(value)) return "Insira um URL válido.";
  for (const label of url.hostname.toLowerCase().split(".")) {
    if (!label || !/^[a-z0-9-]+$/.test(label)) {
      return "O domínio é inválido. Use pontos, não vírgulas.";
    }
  }
  return null;
}

function fileIssue(files: File[], label: string, required: boolean) {
  if (!files.length) return required ? `Anexe ${label}.` : null;
  if (files.length > VERCEL_SCREENSHOT_LIMIT) return "Envie no máximo 5 arquivos.";
  let total = 0;
  for (const file of files) {
    total += file.size;
    if (file.size > VERCEL_FILE_BYTES) return "Cada arquivo pode ter no máximo 4 MB.";
    const type = file.type === "image/jpg" ? "image/jpeg" : file.type;
    if (!IMAGE_TYPES.has(file.type) && type !== "image/jpeg") {
      return "Envie GIF, JPG ou PNG.";
    }
  }
  if (total > VERCEL_COMBINED_BYTES) return "O tamanho total não pode passar de 2 MB.";
  return null;
}

export type VercelCampaign = {
  infringingUrl: string;
  realContentUrl: string;
  what: string;
  forwardToOwner: boolean;
  includeContact: boolean;
  impacted: boolean;
  screenshots: File[];
  evidence: File[];
};

export function readVercelCampaign(form: FormData): { error: string } | { campaign: VercelCampaign } {
  const infringingRaw = String(form.get("infringingUrl") ?? "");
  const realRaw = String(form.get("realContentUrl") ?? "").trim();
  const what = String(form.get("whatItIs") ?? "").trim().slice(0, 800);
  const forwardToOwner = form.get("forwardReportToWebsiteOwner") === "on";
  const includeContact = forwardToOwner && form.get("includeContactInReportToWebsiteOwner") === "on";
  const impacted = form.get("reporterOrUserWasImpacted") === "Yes";
  const screenshots = form
    .getAll("screenshotEvidence")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const evidence = form
    .getAll("personalImpactEvidence")
    .filter((item): item is File => item instanceof File && item.size > 0);

  const infringingIssue = vercelUrlIssue(infringingRaw);
  if (infringingIssue) return { error: infringingIssue };
  let realContentUrl = "";
  if (realRaw) {
    const realIssue = vercelUrlIssue(realRaw);
    if (realIssue) return { error: `Marca imitada: ${realIssue}` };
    realContentUrl = normalizeVercelUrl(realRaw);
  }
  if (what.length < 12) {
    return { error: "Diga o que o site falso faz. Esse texto acompanha os mil títulos prontos." };
  }
  const shotIssue = fileIssue(screenshots, "as capturas de tela de phishing", false);
  if (shotIssue) return { error: shotIssue };
  const evidenceIssue = fileIssue(evidence, "as evidências de impacto pessoal", impacted);
  if (evidenceIssue) return { error: evidenceIssue };

  return {
    campaign: {
      infringingUrl: normalizeVercelUrl(infringingRaw),
      realContentUrl,
      what,
      forwardToOwner,
      includeContact,
      impacted,
      screenshots,
      evidence: impacted ? evidence : [],
    },
  };
}

export function readVercelReport(form: FormData):
  | { error: string }
  | { report: VercelPhishingInput; screenshots: File[]; evidence: File[] } {
  const name = String(form.get("reporterName") ?? "").trim().slice(0, 80);
  const email = String(form.get("reporterEmail") ?? "").trim().slice(0, 80);
  const infringingRaw = String(form.get("infringingUrl") ?? "");
  const realRaw = String(form.get("realContentUrl") ?? "").trim();
  const steps = String(form.get("stepsToReproduce") ?? "").trim().slice(0, 4000);
  const forwardToOwner = form.get("forwardReportToWebsiteOwner") === "on";
  const includeContact = forwardToOwner && form.get("includeContactInReportToWebsiteOwner") === "on";
  const impacted = form.get("reporterOrUserWasImpacted") === "Yes";
  const screenshots = form
    .getAll("screenshotEvidence")
    .filter((item): item is File => item instanceof File && item.size > 0);
  const evidence = form
    .getAll("personalImpactEvidence")
    .filter((item): item is File => item instanceof File && item.size > 0);

  if (!name) return { error: "Coloque o nome completo." };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Coloque um e-mail válido." };
  }
  const infringingIssue = vercelUrlIssue(infringingRaw);
  if (infringingIssue) return { error: infringingIssue };
  let realContentUrl = "";
  if (realRaw) {
    const realIssue = vercelUrlIssue(realRaw);
    if (realIssue) return { error: `Marca imitada: ${realIssue}` };
    realContentUrl = normalizeVercelUrl(realRaw);
  }
  if (!steps) return { error: "Descreva os passos para reproduzir." };
  const shotIssue = fileIssue(screenshots, "as capturas de tela de phishing", true);
  if (shotIssue) return { error: shotIssue };
  const evidenceIssue = fileIssue(evidence, "as evidências de impacto pessoal", impacted);
  if (evidenceIssue) return { error: evidenceIssue };

  return {
    report: {
      name,
      email,
      infringingUrl: normalizeVercelUrl(infringingRaw),
      realContentUrl,
      forwardToOwner,
      includeContact,
      impacted,
      steps,
    },
    screenshots,
    evidence: impacted ? evidence : [],
  };
}

export function appendVercelPhishing(
  form: FormData,
  report: VercelPhishingInput,
  screenshots: File[],
  evidence: File[]
) {
  form.set("reporterName", report.name);
  form.set("reporterEmail", report.email);
  form.set("abuseType", VERCEL_ABUSE_TYPE);
  form.set("infringingUrl", report.infringingUrl);
  if (report.realContentUrl) form.set("realContentUrl", report.realContentUrl);
  form.set("reporterOrUserWasImpacted", report.impacted ? "Yes" : "No");
  form.set("stepsToReproduce", report.steps);
  if (report.forwardToOwner) form.set("forwardReportToWebsiteOwner", "on");
  if (report.includeContact) form.set("includeContactInReportToWebsiteOwner", "on");
  for (const file of screenshots) form.append("screenshotEvidence", file, file.name);
  for (const file of evidence) form.append("personalImpactEvidence", file, file.name);
}
