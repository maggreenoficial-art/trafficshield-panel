import { fetchThroughProxy } from "@/lib/offers/proxy-fetch";
import type { OfferProxy } from "@/lib/offers/proxy-parse";
import {
  REPORT_CHANNEL_LABEL,
  type ReportAttempt,
  type ReportChannel,
} from "@/lib/reports/channels";
import { escapeReportText } from "@/lib/reports/urls";
import {
  appendVercelPhishing,
  type VercelPhishingInput,
} from "@/lib/reports/vercel-form";

export { REPORT_CHANNELS, REPORT_CHANNEL_LABEL } from "@/lib/reports/channels";
export type { ReportAttempt, ReportChannel } from "@/lib/reports/channels";

const CHROME_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function clip(value: string) {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
}

function blocked(text: string) {
  return /attention required|just a moment|cf-error|executeChallenge|forbidden/i.test(text);
}

export function googleReportBody(url: string, note: string) {
  return JSON.stringify([
    url,
    null,
    null,
    `<p>${escapeReportText(note).slice(0, 800)}</p>`,
    null,
    null,
  ]);
}

export function cloudflareReportBody(input: {
  url: string;
  note: string;
  name: string;
  email: string;
}) {
  const fields = new URLSearchParams({
    act: "abuse_phishing",
    name: input.name,
    email: input.email,
    email2: input.email,
    urls: input.url,
    justification: input.note.slice(0, 2000),
    comments: "Site falso denunciado pelo painel.",
    host_notification: "send-anon",
    owner_notification: "send-anon",
  });
  return fields.toString();
}

export function vercelReportForm(
  report: VercelPhishingInput,
  screenshots: File[],
  evidence: File[] = []
) {
  const form = new FormData();
  appendVercelPhishing(form, report, screenshots, evidence);
  return form;
}

function vercelFailure(text: string, status: number) {
  try {
    const json = JSON.parse(text) as {
      error?: { message?: string; errors?: Record<string, string> | string };
      errors?: Record<string, string> | { message?: string };
    };
    const bag = json.error?.errors ?? json.errors;
    if (bag && typeof bag === "object") {
      const parts = Object.entries(bag)
        .map(([key, value]) => `${key}: ${value}`)
        .join(" ");
      if (parts) return parts.slice(0, 180);
    }
    if (typeof json.error?.message === "string") return json.error.message.slice(0, 180);
  } catch {
    /* corpo em HTML */
  }
  return clip(text) || `Vercel respondeu HTTP ${status}.`;
}

async function postReport(
  proxy: OfferProxy,
  url: string,
  init: { headers: Record<string, string>; body: string | FormData }
) {
  return fetchThroughProxy(proxy, url, {
    method: "POST",
    headers: init.headers,
    body: init.body,
    timeoutMs: 25_000,
    userAgent: CHROME_UA,
  });
}

export async function fileReport(input: {
  channel: ReportChannel;
  url: string;
  note: string;
  name: string;
  email: string;
  proxy: OfferProxy;
}): Promise<ReportAttempt> {
  const proxyLabel = `${input.proxy.host}:${input.proxy.port}`;
  try {
    const res =
      input.channel === "google"
        ? await postReport(
            input.proxy,
            "https://safebrowsing.google.com/safebrowsing/clientreport/crx-report",
            {
              headers: { "Content-Type": "application/json", Accept: "application/json" },
              body: googleReportBody(input.url, input.note),
            }
          )
        : input.channel === "cloudflare"
          ? await postReport(input.proxy, "https://abuse.cloudflare.com/", {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "text/html,application/json",
                Origin: "https://abuse.cloudflare.com",
                Referer: "https://abuse.cloudflare.com/",
              },
              body: cloudflareReportBody(input),
            })
          : null;
    if (!res) {
      return fileVercelReport({
        proxy: input.proxy,
        report: {
          name: input.name,
          email: input.email,
          infringingUrl: input.url,
          realContentUrl: "",
          forwardToOwner: false,
          includeContact: false,
          impacted: false,
          steps: input.note,
        },
        screenshots: [],
        evidence: [],
      });
    }
    const snippet = clip(res.text);
    const refused = blocked(res.text) || res.status === 403 || res.status === 401;
    const ok = res.status >= 200 && res.status < 300 && !refused;
    return {
      channel: input.channel,
      ok,
      status: res.status,
      proxy: proxyLabel,
      detail: ok
        ? `Enviada pelo proxy ${proxyLabel}.`
        : refused
          ? `O proxy ${proxyLabel} chegou, mas ${REPORT_CHANNEL_LABEL[input.channel]} barrou o envio automático.`
          : snippet || `${REPORT_CHANNEL_LABEL[input.channel]} respondeu HTTP ${res.status}.`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no proxy.";
    return {
      channel: input.channel,
      ok: false,
      status: null,
      proxy: proxyLabel,
      detail: `Proxy ${proxyLabel}: ${message}`.slice(0, 180),
    };
  }
}

export async function fileVercelReport(input: {
  proxy: OfferProxy;
  report: VercelPhishingInput;
  screenshots: File[];
  evidence: File[];
}): Promise<ReportAttempt> {
  const proxyLabel = `${input.proxy.host}:${input.proxy.port}`;
  try {
    const res = await postReport(input.proxy, "https://vercel.com/api/report-abuse", {
      headers: {
        Accept: "application/json",
        Origin: "https://vercel.com",
        Referer: "https://vercel.com/abuse",
      },
      body: vercelReportForm(input.report, input.screenshots, input.evidence),
    });
    const refused = blocked(res.text) || res.status === 403 || res.status === 401;
    const ok = res.status >= 200 && res.status < 300 && !refused;
    return {
      channel: "vercel",
      ok,
      status: res.status,
      proxy: proxyLabel,
      detail: ok
        ? `Enviada pelo proxy ${proxyLabel}.`
        : refused
          ? `O proxy ${proxyLabel} chegou, mas a Vercel barrou o envio automático.`
          : vercelFailure(res.text, res.status),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Falha no proxy.";
    return {
      channel: "vercel",
      ok: false,
      status: null,
      proxy: proxyLabel,
      detail: `Proxy ${proxyLabel}: ${message}`.slice(0, 180),
    };
  }
}
