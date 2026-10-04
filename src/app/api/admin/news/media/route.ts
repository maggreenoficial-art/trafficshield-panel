import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  isDirectVideoUrl,
  isHostedPlayer,
  NEWS_BROWSER_UA,
  parsePublicHttpUrl,
} from "@/lib/news/article";
import { fetchInstagramMeta } from "@/lib/news/instagram";
import { instagramPostUrl } from "@/lib/news/social";

export const maxDuration = 60;

const MAX_BYTES = 80 * 1024 * 1024;

function fileName(kind: "image" | "video", type: string, title: string) {
  const base =
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "noticia";
  const ext = type.includes("png")
    ? "png"
    : type.includes("webp")
      ? "webp"
      : type.includes("webm")
        ? "webm"
        : type.includes("quicktime") || type.includes("mov")
          ? "mov"
          : kind === "video"
            ? "mp4"
            : "jpg";
  return `${base}-${kind}.${ext}`;
}

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  const url = parsePublicHttpUrl(request.nextUrl.searchParams.get("url") ?? "");
  const page = parsePublicHttpUrl(request.nextUrl.searchParams.get("page") ?? "");
  const kind =
    request.nextUrl.searchParams.get("kind") === "video" ? "video" : "image";
  const title = request.nextUrl.searchParams.get("title") ?? "noticia";

  if (!url) {
    return NextResponse.json({ error: "URL de mídia inválida." }, { status: 400 });
  }

  let mediaUrl = url;
  const igPage =
    instagramPostUrl(page?.toString() ?? "") || instagramPostUrl(url.toString());
  if (
    igPage &&
    (kind === "video" || Boolean(instagramPostUrl(url.toString())))
  ) {
    const meta = await fetchInstagramMeta(igPage);
    const fresh = kind === "video" ? meta?.videoUrl : meta?.imageUrl;
    const parsed = fresh ? parsePublicHttpUrl(fresh) : null;
    if (!parsed) {
      return NextResponse.json(
        {
          error:
            kind === "video"
              ? "O Instagram não soltou o arquivo deste vídeo. Abra o original."
              : "O Instagram não soltou o arquivo desta imagem. Abra o original.",
          openUrl: igPage,
        },
        { status: 409 }
      );
    }
    mediaUrl = parsed;
  } else if (kind === "video" && isHostedPlayer(url.toString()) && !isDirectVideoUrl(url.toString())) {
    return NextResponse.json(
      {
        error: "Este vídeo está no player da matéria. Abra o link original.",
        openUrl: url.toString(),
      },
      { status: 409 }
    );
  }

  try {
    const upstream = await fetch(mediaUrl.toString(), {
      redirect: "follow",
      headers: {
        Accept: kind === "video" ? "video/*,*/*" : "image/*,*/*",
        "User-Agent": NEWS_BROWSER_UA,
        Referer: igPage || page?.toString() || mediaUrl.toString(),
      },
      signal: AbortSignal.timeout(25_000),
    });
    if ((!upstream.ok || !upstream.body) && igPage && kind === "image") {
      const meta = await fetchInstagramMeta(igPage);
      const parsed = meta?.imageUrl ? parsePublicHttpUrl(meta.imageUrl) : null;
      if (parsed) {
        const retry = await fetch(parsed.toString(), {
          redirect: "follow",
          headers: {
            Accept: "image/*,*/*",
            "User-Agent": NEWS_BROWSER_UA,
            Referer: igPage,
          },
          signal: AbortSignal.timeout(25_000),
        });
        if (retry.ok && retry.body) {
          const type = (retry.headers.get("content-type") ?? "").split(";")[0].trim();
          const name = fileName(kind, type, title);
          return new NextResponse(retry.body, {
            status: 200,
            headers: {
              "Content-Type": type || "image/jpeg",
              "Content-Disposition": `attachment; filename="${name}"`,
              "Cache-Control": "no-store",
            },
          });
        }
      }
    }
    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `A mídia respondeu HTTP ${upstream.status}.` },
        { status: 502 }
      );
    }

    const type = (upstream.headers.get("content-type") ?? "").split(";")[0].trim();
    if (type.includes("text/html")) {
      return NextResponse.json(
        {
          error:
            kind === "video"
              ? "A matéria não tem um arquivo de vídeo para baixar. Use o link original."
              : "A matéria não tem um arquivo de imagem para baixar. Use o link original.",
          openUrl: url.toString(),
        },
        { status: 409 }
      );
    }
    if (kind === "image" && type && !type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Esse endereço não é uma imagem." },
        { status: 415 }
      );
    }
    if (kind === "video" && type && !type.startsWith("video/") && !type.includes("octet-stream")) {
      return NextResponse.json(
        { error: "Esse endereço não é um vídeo." },
        { status: 415 }
      );
    }

    const length = Number(upstream.headers.get("content-length") ?? 0);
    if (length > MAX_BYTES) {
      return NextResponse.json(
        { error: "Arquivo maior que 80MB." },
        { status: 413 }
      );
    }

    const name = fileName(kind, type, title);
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": type || (kind === "video" ? "video/mp4" : "image/jpeg"),
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível baixar essa mídia." },
      { status: 502 }
    );
  }
}
