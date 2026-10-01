import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";

const MAX_VIDEO_BYTES = 180 * 1024 * 1024;
const CORE_BASE =
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm";

let ffmpeg: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;
const ffmpegLogs: string[] = [];

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

function failureDetail() {
  const line = [...ffmpegLogs]
    .reverse()
    .find((message) =>
      /error|invalid|failed|unknown|could not/i.test(message)
    );
  return line?.trim();
}

async function getFfmpeg(): Promise<FFmpeg> {
  if (ffmpeg?.loaded) return ffmpeg;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const instance = new FFmpeg();
    instance.on("log", ({ message }) => {
      if (!message) return;
      ffmpegLogs.push(message);
      if (ffmpegLogs.length > 40) ffmpegLogs.shift();
    });
    const workerURL = new URL("/ffmpeg/worker.js", window.location.href).href;
    await instance.load({
      classWorkerURL: workerURL,
      coreURL: `${CORE_BASE}/ffmpeg-core.js`,
      wasmURL: `${CORE_BASE}/ffmpeg-core.wasm`,
    });
    ffmpeg = instance;
    return instance;
  })();

  try {
    return await loadPromise;
  } catch (err) {
    loadPromise = null;
    ffmpeg = null;
    const detail = err instanceof Error ? err.message : "falha ao iniciar";
    throw new Error(
      `Não foi possível iniciar a limpeza do vídeo (${detail}).`
    );
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
    "-map",
    "0:v:0",
    "-map",
    "0:a:0?",
    "-dn",
    "-sn",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
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
  const stamp = Math.random().toString(36).slice(2, 8);
  const inputName = `in-${stamp}.${ext}`;
  const outExt = ext === "webm" ? "webm" : "mp4";
  const outputName = `out-${stamp}.${outExt}`;
  const mime = outExt === "webm" ? "video/webm" : "video/mp4";

  ffmpegLogs.length = 0;
  await instance.writeFile(inputName, await fetchFile(file));

  try {
    const copyArgs =
      outExt === "mp4"
        ? ["-c", "copy", "-movflags", "+faststart"]
        : ["-c", "copy"];

    let ok = await runStrip(instance, inputName, outputName, copyArgs);

    if (!ok) {
      await instance.deleteFile(outputName).catch(() => undefined);
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
      const detail = failureDetail();
      throw new Error(
        detail
          ? `Não foi possível limpar este vídeo. ${detail}`
          : "Não foi possível limpar este vídeo."
      );
    }

    const data = await instance.readFile(outputName);
    const bytes = data instanceof Uint8Array ? data : new Uint8Array();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);

    return {
      blob: new Blob([copy], { type: mime }),
      filename: `${baseName(file.name)}-limpo.${outExt}`,
    };
  } finally {
    await instance.deleteFile(inputName).catch(() => undefined);
    await instance.deleteFile(outputName).catch(() => undefined);
  }
}
