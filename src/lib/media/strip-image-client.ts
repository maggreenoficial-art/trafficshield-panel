/** Reencoda no browser: tira EXIF/GPS/XMP sem depender do servidor. */

export type ClientStrippedImage = {
  blob: Blob;
  filename: string;
};

function baseName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80) || "criativo"
  );
}

function outputType(mime: string): { type: string; ext: string; quality?: number } {
  if (mime === "image/png") return { type: "image/png", ext: "png" };
  if (mime === "image/webp") return { type: "image/webp", ext: "webp", quality: 0.92 };
  return { type: "image/jpeg", ext: "jpg", quality: 0.92 };
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality?: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("O navegador não conseguiu reencodar esta imagem."));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });
}

export async function stripImageInBrowser(file: File): Promise<ClientStrippedImage> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Arquivo de imagem inválido ou corrompido.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("Canvas indisponível neste navegador.");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const out = outputType(file.type);
  let blob: Blob;
  try {
    blob = await canvasToBlob(canvas, out.type, out.quality);
  } catch {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
    return {
      blob,
      filename: `${baseName(file.name)}-limpo.jpg`,
    };
  }

  canvas.width = 0;
  canvas.height = 0;

  return {
    blob,
    filename: `${baseName(file.name)}-limpo.${
      blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"
    }`,
  };
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
