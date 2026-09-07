import { NextResponse, type NextRequest } from "next/server";
import { logCampaignClick } from "@/lib/db/traffic-campaigns";
import { getInternalTrafficSecret } from "@/lib/security/internal-secret";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const secret = getInternalTrafficSecret();
  const header = request.headers.get("x-traffic-internal");

  if (!secret || !header || header !== secret) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      tenantId?: string;
      campaignId?: string;
      destination?: "offer" | "safe";
      country?: string;
      device?: string;
      trafficSource?: string;
      ipHash?: string;
      reasons?: string[];
    };

    if (!body.campaignId || !body.destination || !body.ipHash) {
      return NextResponse.json({ error: "Payload inválido." }, { status: 400 });
    }

    await logCampaignClick({
      tenantId: body.tenantId,
      campaignId: body.campaignId,
      destination: body.destination,
      country: body.country,
      device: body.device,
      trafficSource: body.trafficSource,
      ipHash: body.ipHash,
      reasons: body.reasons ?? [],
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Erro ao registrar." }, { status: 500 });
  }
}
