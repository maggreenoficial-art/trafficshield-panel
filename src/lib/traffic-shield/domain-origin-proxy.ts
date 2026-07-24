import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
]);

export function getRequestHostname(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
    request.headers.get("host") ||
    request.nextUrl.hostname
  )
    .toLowerCase()
    .split(":")[0];
}

export function isPanelHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().split(":")[0];

  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".vercel.app")) return true;

  for (const raw of [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.TRAFFIC_SITE_DOMAIN,
  ]) {
    if (!raw?.trim()) continue;
    try {
      const panelHost = normalizeHostname(
        new URL(raw.startsWith("http") ? raw : `https://${raw}`).hostname
      );
      if (panelHost === normalizeHostname(host)) return true;
    } catch {
      // ignore
    }
  }

  return false;
}

export async function proxyRequestToOrigin(
  request: NextRequest,
  originUrl: string,
  publicHost: string
): Promise<NextResponse> {
  const origin = new URL(originUrl);
  const target = new URL(
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
    origin
  );

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  headers.set("host", publicHost);
  headers.set("x-forwarded-host", publicHost);
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));
  headers.set("x-norat-proxy", "1");

  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: "manual",
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json(
      { error: "Método não suportado no proxy de origem." },
      { status: 405 }
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), init);
  } catch {
    return NextResponse.json(
      {
        error:
          "Não foi possível conectar à origem do site. Verifique a URL de origem no painel norat.",
      },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!HOP_BY_HOP.has(key.toLowerCase())) {
      responseHeaders.set(key, value);
    }
  });

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
