import { NextResponse, type NextRequest } from "next/server";
import {
  findOfferClickForAttribution,
  getCampaignBySlug,
  logCampaignConversion,
} from "@/lib/db/traffic-campaigns";
import {
  checkRateLimit,
  clientIpFromRequest,
} from "@/lib/security/rate-limit";
import type { ConversionEvent } from "@/lib/traffic-shield/campaign-types";
import { extractClickIdFromParams } from "@/lib/traffic-shield/tracking-params";

export const runtime = "nodejs";

function parseEvent(raw: unknown): ConversionEvent | null {
  if (raw === "purchase" || raw === "order_bump") return raw;
  return null;
}

async function readPayload(request: NextRequest): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  request.nextUrl.searchParams.forEach((v, k) => {
    out[k] = v;
  });

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        const body = (await request.json()) as Record<string, unknown>;
        for (const [k, v] of Object.entries(body)) {
          if (v === null || v === undefined) continue;
          out[k] = String(v);
        }
      } else if (
        contentType.includes("application/x-www-form-urlencoded") ||
        contentType.includes("multipart/form-data")
      ) {
        const form = await request.formData();
        form.forEach((v, k) => {
          if (typeof v === "string") out[k] = v;
        });
      }
    } catch {
      // ignore body parse errors — query ainda vale
    }
  }

  return out;
}

async function handleConversion(request: NextRequest) {
  const ip = clientIpFromRequest(request);
  const limited = checkRateLimit(`conversion:${ip}`, 60, 60_000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Muitas requisições." },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const payload = await readPayload(request);
  const slug = (payload.campaign ?? payload.slug ?? "").trim();
  const token = (payload.token ?? payload.vp_t ?? "").trim();
  const event = parseEvent(payload.event ?? "purchase");
  const orderId = (payload.order_id ?? payload.orderId ?? "").trim() || null;
  const currency = (payload.currency ?? "BRL").trim().toUpperCase() || "BRL";
  const valueRaw = payload.value ?? payload.amount ?? "0";
  const value = Number(String(valueRaw).replace(",", "."));
  const fbclid = (payload.fbclid ?? "").trim() || null;
  const clickIdParam =
    (payload.click_id ?? payload.clickId ?? "").trim() ||
    extractClickIdFromParams({
      fbclid: fbclid ?? "",
      gclid: payload.gclid ?? "",
      ttclid: payload.ttclid ?? "",
    });

  if (!slug || !token) {
    return NextResponse.json(
      { error: "Informe campaign (slug) e token (vp_t)." },
      { status: 400 }
    );
  }
  if (!event) {
    return NextResponse.json(
      { error: "event deve ser purchase ou order_bump." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(value) || value < 0) {
    return NextResponse.json({ error: "value inválido." }, { status: 400 });
  }

  const campaign = await getCampaignBySlug(slug);
  if (!campaign) {
    return NextResponse.json({ error: "Campanha não encontrada." }, { status: 404 });
  }
  if (campaign.uniqueTokenEnabled && campaign.uniqueToken !== token) {
    return NextResponse.json({ error: "Token inválido." }, { status: 401 });
  }

  const clickRowId = await findOfferClickForAttribution({
    campaignId: campaign.id,
    clickId: clickIdParam,
    fbclid,
  });

  const result = await logCampaignConversion({
    tenantId: campaign.tenantId ?? null,
    campaignId: campaign.id,
    clickRowId,
    event,
    value,
    currency,
    orderId,
    meta: {
      fbclid,
      click_id: clickIdParam,
      source: "postback",
    },
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    duplicate: Boolean(result.duplicate),
    id: result.id || undefined,
    event,
    attributed: Boolean(clickRowId),
  });
}

export async function GET(request: NextRequest) {
  return handleConversion(request);
}

export async function POST(request: NextRequest) {
  return handleConversion(request);
}
