import sharp from "sharp";

export type StrippedImage = {
  buffer: Buffer;
  contentType: string;
  extension: string;
};

/**
 * Reencoda a imagem aplicando orientação EXIF e removendo metadados
 * (EXIF, XMP, ICC profile, GPS, software, etc.).
 */
export async function stripImageMetadata(
  input: Buffer
): Promise<StrippedImage> {
  const image = sharp(input, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const format = meta.format;

  if (format === "png") {
    const buffer = await image.png({ compressionLevel: 9, force: true }).toBuffer();
    return { buffer, contentType: "image/png", extension: "png" };
  }

  if (format === "webp") {
    const buffer = await image.webp({ quality: 92 }).toBuffer();
    return { buffer, contentType: "image/webp", extension: "webp" };
  }

  // JPEG / outros → JPEG limpo (sem EXIF)
  const buffer = await image.jpeg({ quality: 92, mozjpeg: true }).toBuffer();
  return { buffer, contentType: "image/jpeg", extension: "jpg" };
}
