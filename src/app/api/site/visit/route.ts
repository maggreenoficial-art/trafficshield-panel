import { NextResponse, type NextRequest } from "next/server";
import { recordSiteVisit } from "@/lib/db/site-visits";

function clientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "0";
  return request.headers.get("x-real-ip")?.trim() || "0";
}

/** Registra uma visita à página pública. Uma pessoa conta uma vez por dia. */
export async function POST(request: NextRequest) {
  try {
    await recordSiteVisit({
      ip: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? "",
      path: "/",
    });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
