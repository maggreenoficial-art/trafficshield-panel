import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  appendReportLogs,
  getReportBatch,
  getReportConfig,
  saveReportBatch,
} from "@/lib/db/reports";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { builtInReportPersonas, type ReportPersona } from "@/lib/reports/identities";
import { fileVercelReport } from "@/lib/reports/submit";
import { defaultReportScreenshots } from "@/lib/reports/evidence";
import { readVercelCampaign, type VercelCampaign } from "@/lib/reports/vercel-form";

export const maxDuration = 120;

const SEND_BATCH = 3;

function campaignKey(campaign: VercelCampaign, proxyCount: number) {
  return [
    campaign.infringingUrl,
    campaign.realContentUrl,
    campaign.what,
    campaign.forwardToOwner ? "1" : "0",
    campaign.includeContact ? "1" : "0",
    campaign.impacted ? "1" : "0",
    String(proxyCount),
  ].join("|");
}

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const form = await request.formData();
    const parsed = readVercelCampaign(form);
    if ("error" in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const campaign = parsed.campaign;
    const current = await getReportConfig();
    const proxies = parseOfferProxyList(current.proxies.join("\n"));
    if (!proxies.length) {
      return NextResponse.json(
        { error: "Cole a lista de proxies antes de denunciar." },
        { status: 400 }
      );
    }

    const key = campaignKey(campaign, proxies.length);
    const stored = await getReportBatch();
    let personas: ReportPersona[] = stored?.key === key ? stored.personas : [];
    let sent = stored?.key === key ? stored.sent : 0;

    if (personas.length < proxies.length) {
      personas = builtInReportPersonas(campaign.infringingUrl, proxies.length);
      sent = 0;
      await saveReportBatch({ key, personas, sent });
    }

    const screenshots = defaultReportScreenshots();
    const end = Math.min(proxies.length, sent + SEND_BATCH);
    const entries = [];
    for (let index = sent; index < end; index += 1) {
      const persona = personas[index];
      const title = persona.steps;
      const result = await fileVercelReport({
        proxy: proxies[index],
        report: {
          name: persona.name,
          email: persona.email,
          infringingUrl: campaign.infringingUrl,
          realContentUrl: campaign.realContentUrl,
          forwardToOwner: campaign.forwardToOwner,
          includeContact: campaign.includeContact,
          impacted: campaign.impacted,
          steps: title,
        },
        screenshots,
        evidence: campaign.evidence,
      });
      entries.push({
        url: campaign.infringingUrl,
        note: title,
        results: [result],
      });
    }
    sent = end;
    await saveReportBatch({ key, personas, sent });
    const logs = await appendReportLogs(entries);
    return NextResponse.json({
      logs,
      progress: { phase: "send", ready: personas.length, sent, total: proxies.length },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao denunciar.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
