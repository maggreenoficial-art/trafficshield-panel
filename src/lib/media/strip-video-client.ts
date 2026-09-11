import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const MAX_VIDEO_BYTES = 180 * 1024 * 1024;

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

function baseName(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w\-]+/g, "_")
      .slice(0, 80) || "criativo"
  );
}

function videoExt(file: File): "mp4" | "webm" | "mov" {
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  if (type.includes("webm") || name.endsWith(".webm")) return "webm";
  if (type.includes("quicktime") || name.endsWith(".mov")) return "mov";
  return "mp4";
}

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const instance = new FFmpeg();
    const baseURL = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";
    await instance.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpeg = instance;
    return instance;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    ffmpeg = null;
    throw err;
  }
}

async function runStrip(
  instance: FFmpeg,
  inputName: string,
  outputName: string,
  extra: string[]
): Promise<boolean> {
  const code = await instance.exec([
    "-i",
    inputName,
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-fflags",
    "+bitexact",
    ...extra,
    outputName,
  ]);
  return code === 0;
}

/** Remuxa o vídeo sem metadados de container (título, encoder, GPS, data). */
export async function stripVideoInBrowser(file: File): Promise<{
  blob: Blob;
  filename: string;
}> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("Vídeo maior que 180MB. Comprima e tente de novo.");
  }

  const ext = videoExt(file);
  const instance = await getFfmpeg();
  const inputName = `in.${ext}`;
  const outExt = ext === "webm" ? "webm" : "mp4";
  const outputName = `out.${outExt}`;
  const mime = outExt === "webm" ? "video/webm" : "video/mp4";

  await instance.writeFile(inputName, await fetchFile(file));

  const copyArgs =
    outExt === "mp4"
      ? ["-c", "copy", "-movflags", "+faststart"]
      : ["-c", "copy"];

  let ok = await runStrip(instance, inputName, outputName, copyArgs);

  if (!ok) {
    const reencode =
      outExt === "webm"
        ? ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "32", "-c:a", "libopus"]
        : [
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-c:a",
            "aac",
            "-movflags",
            "+faststart",
          ];
    ok = await runStrip(instance, inputName, outputName, reencode);
  }

  if (!ok) {
    await instance.deleteFile(inputName).catch(() => undefined);
    throw new Error("Não foi possível limpar este vídeo.");
  }

  const data = await instance.readFile(outputName);
  await instance.deleteFile(inputName).catch(() => undefined);
  await instance.deleteFile(outputName).catch(() => undefined);

  const bytes = data instanceof Uint8Array ? data : new Uint8Array();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);

  return {
    blob: new Blob([copy], { type: mime }),
    filename: `${baseName(file.name)}-limpo.${outExt}`,
  };
}
