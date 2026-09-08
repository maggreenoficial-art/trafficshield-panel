import { NextResponse, type NextRequest } from "next/server";
import { requirePanelContext } from "@/lib/api/panel-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";

const BUCKET = "storyboard-assets";
const MAX_IMAGE = 30 * 1024 * 1024;
const MAX_VIDEO = 100 * 1024 * 1024;

const IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export async function POST(request: NextRequest) {
  const ctx = await requirePanelContext(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Arquivo obrigatório." }, { status: 400 });
    }

    const isImage = IMAGE_TYPES.has(file.type);
    const isVideo = VIDEO_TYPES.has(file.type);
    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: "Use imagem (JPEG/PNG/WEBP) ou vídeo (MP4/MOV/WEBM)." },
        { status: 400 }
      );
    }

    const max = isVideo ? MAX_VIDEO : MAX_IMAGE;
    if (file.size > max) {
      return NextResponse.json(
        { error: isVideo ? "Vídeo maior que 100MB." : "Arquivo maior que 30MB." },
        { status: 400 }
      );
    }

    const ext = isVideo
      ? file.type === "video/webm"
        ? "webm"
        : file.type === "video/quicktime"
          ? "mov"
          : "mp4"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";

    const path = `${ctx.tenantId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const supabase = createAdminClient();
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });

    if (error) {
      return NextResponse.json(
        {
          error:
            error.message.includes("Bucket not found")
              ? "Bucket storyboard-assets não existe. Rode supabase/patch-storyboard-storage.sql."
              : error.message,
        },
        { status: 500 }
      );
    }

    const base = getSupabaseUrl().replace(/\/$/, "");
    const url = `${base}/storage/v1/object/public/${BUCKET}/${path}`;

    return NextResponse.json({
      url,
      path,
      mediaType: isVideo ? "video" : "image",
    });
  } catch {
    return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
  }
}
