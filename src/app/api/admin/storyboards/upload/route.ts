import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { stripImageMetadata } from "@/lib/media/strip-image-metadata";

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
  const ctx = await requirePlatformAdmin(request);
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

    const raw = Buffer.from(await file.arrayBuffer());
    let uploadBuffer: Buffer = raw;
    let contentType = file.type;
    let ext = isVideo
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

    if (isImage) {
      const cleaned = await stripImageMetadata(raw);
      uploadBuffer = Buffer.from(cleaned.buffer);
      contentType = cleaned.contentType;
      ext = cleaned.extension;
    }

    const path = `${ctx.tenantId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const supabase = createAdminClient();
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, uploadBuffer, {
        contentType,
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
      metadataStripped: isImage,
    });
  } catch {
    return NextResponse.json({ error: "Falha no upload." }, { status: 500 });
  }
}
