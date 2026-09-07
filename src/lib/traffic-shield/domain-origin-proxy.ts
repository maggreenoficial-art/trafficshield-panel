import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { isKnownPanelHostname } from "@/lib/site-config";
import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";
import { assertPublicOriginHostname } from "@/lib/traffic-shield/origin-url";

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
  if (isKnownPanelHostname(host)) return true;

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
  let origin: URL;
  try {
    origin = new URL(originUrl);
    if (!["http:", "https:"].includes(origin.protocol)) {
      throw new Error("protocol");
    }
    assertPublicOriginHostname(origin.hostname);
  } catch {
    return NextResponse.json(
      { error: "URL de origem inválida ou não permitida." },
      { status: 400 }
    );
  }

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

/** Mirror: busca a URL absoluta da oferta/safe e devolve o HTML no domínio da campanha. */
export async function proxyAbsoluteUrl(
  request: NextRequest,
  absoluteUrl: string
): Promise<NextResponse> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return NextResponse.json(
      { error: "Método não suportado no mirror." },
      { status: 405 }
    );
  }

  let target: URL;
  try {
    target = new URL(absoluteUrl);
    if (!["http:", "https:"].includes(target.protocol)) {
      throw new Error("protocol");
    }
    assertPublicOriginHostname(target.hostname);
  } catch {
    return NextResponse.json(
      { error: "URL de mirror inválida ou não permitida." },
      { status: 400 }
    );
  }

  const headers = new Headers();
  const ua = request.headers.get("user-agent");
  const accept = request.headers.get("accept");
  const acceptLang = request.headers.get("accept-language");
  if (ua) headers.set("user-agent", ua);
  if (accept) headers.set("accept", accept);
  if (acceptLang) headers.set("accept-language", acceptLang);
  headers.set("x-norat-mirror", "1");

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: request.method,
      headers,
      redirect: "follow",
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar a página no mirror." },
      { status: 502 }
    );
  }

  const responseHeaders = new Headers();
  const contentType = upstream.headers.get("content-type");
  if (contentType) responseHeaders.set("content-type", contentType);
  responseHeaders.set("cache-control", "private, no-store");
  responseHeaders.set("x-norat-mirror", "1");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}
