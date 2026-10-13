import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  appendReportLogs,
  getReportBatch,
  getReportConfig,
  listReportLogs,
  saveReportBatch,
} from "@/lib/db/reports";
import { parseOfferProxyList } from "@/lib/offers/proxy-parse";
import { generateReportPersonaBatch, type ReportPersona } from "@/lib/reports/identities";
import { fileVercelReport } from "@/lib/reports/submit";
import { defaultReportScreenshots } from "@/lib/reports/evidence";
import { buildPhishingTitles } from "@/lib/reports/titles";
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
      const more = await generateReportPersonaBatch({
        count: Math.min(12, proxies.length - personas.length),
        url: campaign.infringingUrl,
        brandUrl: campaign.realContentUrl,
        what: campaign.what,
        avoidEmails: personas.map((item) => item.email),
      });
      if (!more.length) {
        return NextResponse.json(
          { error: "A Kie não devolveu dados novos. Tente de novo." },
          { status: 502 }
        );
      }
      const before = personas.length;
      const titles = buildPhishingTitles(campaign.infringingUrl, proxies.length);
      const seen = new Set(personas.map((item) => item.email));
      for (const item of more) {
        if (seen.has(item.email)) continue;
        seen.add(item.email);
        personas.push({ ...item, steps: titles[personas.length] ?? item.steps });
      }
      if (personas.length === before) {
        return NextResponse.json(
          { error: "A Kie repetiu nomes que já estavam prontos. Tente de novo." },
          { status: 502 }
        );
      }
      personas = personas.slice(0, proxies.length);
      await saveReportBatch({ key, personas, sent });
      return NextResponse.json({
        logs: await listReportLogs(),
        progress: { phase: "generate", ready: personas.length, sent, total: proxies.length },
      });
    }

    const screenshots = defaultReportScreenshots();
    const end = Math.min(proxies.length, sent + SEND_BATCH);
    const entries = [];
    for (let index = sent; index < end; index += 1) {
      const persona = personas[index];
      const titles = buildPhishingTitles(campaign.infringingUrl, proxies.length);
      const title = persona.steps || titles[index];
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
