import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { getNewsBrand } from "@/lib/db/news-brand";
import { createBlock, createStoryboard } from "@/lib/db/storyboards";
import { isUrgentNews } from "@/lib/news/feed-title";
import { composeStoryboardPrompt } from "@/lib/news/process";
import { renderFeedPost } from "@/lib/news/render-feed";
import type { NewsDraft } from "@/lib/news/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";

export const maxDuration = 60;

const BUCKET = "storyboard-assets";

async function fetchImage(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      Accept: "image/*,*/*",
      "User-Agent": "Mozilla/5.0",
    },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`A imagem respondeu HTTP ${res.status}.`);
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("text/html")) throw new Error("O endereço não devolveu uma imagem.");
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { draft?: NewsDraft };
    const draft = body.draft;
    if (!draft?.headline?.trim() || !draft.caption?.trim()) {
      return NextResponse.json(
        { error: "Produza a notícia antes de autorizar." },
        { status: 400 }
      );
    }

    const brand = await getNewsBrand();
    if (!brand.logoUrl) {
      return NextResponse.json(
        { error: "Envie a logo branca antes de autorizar." },
        { status: 400 }
      );
    }

    const logo = await fetchImage(brand.logoUrl);
    let photo: Buffer | null = null;
    const photoUrl = draft.news?.imageUrl ?? "";
    if (photoUrl.startsWith("http")) {
      try {
        photo = await fetchImage(photoUrl);
      } catch {
        photo = null;
      }
    }

    const context = [draft.headline, draft.news?.title, draft.news?.summary]
      .filter(Boolean)
      .join("\n");
    const rendered = await renderFeedPost({
      photo,
      logo,
      headline: draft.headline.trim(),
      urgent: isUrgentNews(context),
    });

    const path = `${ctx.tenantId}/${Date.now()}-${crypto.randomUUID()}.png`;
    const supabase = createAdminClient();
    const { error } = await supabase.storage.from(BUCKET).upload(path, rendered.png, {
      contentType: "image/png",
      upsert: false,
    });
    if (error) throw error;
    const imageUrl = `${getSupabaseUrl().replace(/\/$/, "")}/storage/v1/object/public/${BUCKET}/${path}`;

    const stamp = new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date());
    const board = await createStoryboard(ctx.tenantId, {
      name: `Notícia · ${draft.headline} · ${stamp}`.slice(0, 120),
      description: draft.caption.slice(0, 280),
    });

    const block = await createBlock(ctx.tenantId, {
      storyboardId: board.id,
      modelKey: "image",
      prompt: composeStoryboardPrompt({
        ...draft,
        headline: draft.headline.trim(),
        caption: draft.caption.trim(),
      }),
      aspectRatio: "4:5",
      resolution: "1K",
      referenceUrls: [brand.logoUrl, photoUrl].filter((url) => url.startsWith("http")),
      positionX: 120,
      positionY: 100,
      status: "success",
      resultUrl: imageUrl,
      resultUrls: [imageUrl],
    });

    return NextResponse.json({
      storyboardId: board.id,
      name: board.name,
      imageUrl,
      urgent: rendered.urgent,
      block: {
        id: block.id,
        prompt: block.prompt,
        referenceUrls: block.referenceUrls,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha ao criar o post.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
