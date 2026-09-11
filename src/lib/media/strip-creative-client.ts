import { stripImageInBrowser } from "@/lib/media/strip-image-client";
import { stripVideoInBrowser } from "@/lib/media/strip-video-client";

export { downloadBlob } from "@/lib/media/strip-image-client";

export function isImageCreative(file: File) {
  if (/^image\/(jpeg|jpg|png|webp)$/i.test(file.type)) return true;
  return /\.(jpe?g|png|webp)$/i.test(file.name);
}

export function isVideoCreative(file: File) {
  if (/^video\/(mp4|quicktime|webm)$/i.test(file.type)) return true;
  return /\.(mp4|mov|webm)$/i.test(file.name);
}

export async function stripCreativeMetadata(file: File) {
  if (isVideoCreative(file)) return stripVideoInBrowser(file);
  if (isImageCreative(file)) return stripImageInBrowser(file);
  throw new Error("Use imagem (JPEG/PNG/WEBP) ou vídeo (MP4/MOV/WEBM).");
}
