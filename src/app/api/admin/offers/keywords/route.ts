import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { huntOfferKeywords } from "@/lib/offers/keywords";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;
  try {
    const body = (await request.json().catch(() => ({}))) as {
      seed?: string;
      country?: string;
    };
    const hunt = await huntOfferKeywords({
      seed: body.seed ?? "",
      country: body.country,
    });
    return NextResponse.json(hunt);
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao caçar nomes.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
