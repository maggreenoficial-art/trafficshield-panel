"use client";

import { useMemo, useRef, useState } from "react";
import { Download, Loader2, Upload, X } from "lucide-react";
import {
  ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  STORYBOARD_SELECT_CLASS,
  estimateKieCredits,
  formatKieCredits,
  getStoryboardModel,
} from "@/lib/kie/models";
import { imageDownloadName, parseBulkPrompts } from "@/lib/storyboard/bulk-prompts";
import { buildStoredZip } from "@/lib/zip-store";

const BULK_LIMIT = 40;
const BLOCK_W = 300;

export type BulkBlock = {
  id: string;
  modelKey: string;
  prompt: string;
  status: string;
  resultUrl: string | null;
  positionX: number;
  positionY: number;
};

type Props = {
  storyboardId: string;
  blocks: BulkBlock[];
  onBlock: (block: BulkBlock) => void;
  onCredits: (credits: number) => void;
  onClose: () => void;
};

function readyImages(blocks: BulkBlock[]) {
  return blocks.filter(
    (block) =>
      getStoryboardModel(block.modelKey)?.kind === "image" &&
      block.status === "success" &&
      block.resultUrl
  );
}

export async function downloadImageBlocks(
  storyboardId: string,
  blocks: BulkBlock[],
  onProgress?: (message: string) => void
) {
  const images = readyImages(blocks);
  if (!images.length) throw new Error("Nenhuma imagem pronta para baixar.");

  const picker = (
    window as Window & {
      showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    }
  ).showDirectoryPicker;

  let directory: FileSystemDirectoryHandle | null = null;
  if (picker) {
    try {
      directory = await picker();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      directory = null;
    }
  }

  const files: { name: string; data: Uint8Array }[] = [];
  for (let index = 0; index < images.length; index++) {
    const block = images[index];
    onProgress?.(`Baixando ${index + 1} de ${images.length}…`);
    const res = await fetch(
      `/api/admin/storyboards/${storyboardId}/files/${block.id}`
    );
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || "Falha ao baixar uma imagem.");
    }
    const type = res.headers.get("content-type") || "";
    const ext = type.includes("jpeg")
      ? "jpg"
      : type.includes("webp")
        ? "webp"
        : "png";
    const name = imageDownloadName(index, block.prompt || "imagem", ext);
    const data = new Uint8Array(await res.arrayBuffer());
    if (directory) {
      const handle = await directory.getFileHandle(name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();
    } else {
      files.push({ name, data });
    }
  }

  if (!directory) {
    onProgress?.("Montando o ZIP…");
    const zip = buildStoredZip(files);
    const bytes = new ArrayBuffer(zip.byteLength);
    new Uint8Array(bytes).set(zip);
    const blob = new Blob([bytes], { type: "application/zip" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "storyboard-imagens.zip";
    link.click();
    URL.revokeObjectURL(url);
  }
}

export function StoryboardBulkImages({
  storyboardId,
  blocks,
  onBlock,
  onCredits,
  onClose,
}: Props) {
  const [text, setText] = useState("");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [resolution, setResolution] = useState("1K");
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [batchIds, setBatchIds] = useState<string[]>([]);

  const prompts = useMemo(() => parseBulkPrompts(text).slice(0, BULK_LIMIT), [text]);
  const parsedCount = parseBulkPrompts(text).length;
  const unitCost = estimateKieCredits("image", resolution);
  const totalCost = Math.round(unitCost * prompts.length * 100) / 100;
  const batchBlocks = blocks.filter((block) => batchIds.includes(block.id));
  const batchReady = readyImages(batchBlocks);
  const allReady = readyImages(blocks);
  const baseChoices = allReady.filter((block) => block.resultUrl);

  async function uploadBase(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/admin/storyboards/upload", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error || "Falha no upload");
      setBaseUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function generateAll() {
    if (!prompts.length || busy) return;
    setBusy(true);
    setError("");
    const maxX = blocks.reduce((max, block) => Math.max(max, block.positionX), 0);
    const originX = blocks.length ? maxX + BLOCK_W + 80 : 140;
    const originY = 80;
    const created: string[] = [];

    try {
      for (let index = 0; index < prompts.length; index++) {
        setProgress(`Enviando ${index + 1} de ${prompts.length}…`);
        const res = await fetch(`/api/admin/storyboards/${storyboardId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            modelKey: "image",
            prompt: prompts[index],
            aspectRatio,
            resolution,
            referenceUrls: baseUrl ? [baseUrl] : [],
            positionX: originX + (index % 3) * (BLOCK_W + 36),
            positionY: originY + Math.floor(index / 3) * 560,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha ao gerar.");
        created.push(data.block.id as string);
        setBatchIds([...created]);
        onBlock(data.block as BulkBlock);
        if (typeof data.credits === "number") onCredits(data.credits);
      }
      setProgress(`${created.length} imagem(ns) na fila.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao gerar em massa.");
      setProgress(
        created.length
          ? `${created.length} enviada(s) antes do erro.`
          : ""
      );
    } finally {
      setBusy(false);
    }
  }

  async function download(which: "batch" | "all") {
    const target = which === "batch" ? batchBlocks : blocks;
    setDownloading(true);
    setError("");
    try {
      await downloadImageBlocks(storyboardId, target, setProgress);
      setProgress("");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro no download.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <aside className="absolute top-20 right-4 z-40 flex max-h-[calc(100vh-8rem)] w-[min(380px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/[0.1] bg-[#0c1018] shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2.5">
        <div>
          <p className="text-sm font-medium text-white">Imagens em massa</p>
          <p className="text-[11px] text-white/40">Criar imagem · um prompt por bloco</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="text-white/40 hover:text-white disabled:opacity-40"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-3 overflow-y-auto p-3">
        <div>
          <p className="mb-1 text-[10px] text-white/40">Imagem base</p>
          <div className="flex items-center gap-2">
            {baseUrl ? (
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-white/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={baseUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  disabled={busy}
                  className="absolute top-0 right-0 rounded bg-black/70 p-0.5"
                  onClick={() => setBaseUrl(null)}
                >
                  <X size={10} />
                </button>
              </div>
            ) : null}
            <div className="min-w-0 flex-1 space-y-1.5">
              <button
                type="button"
                disabled={busy || uploading}
                onClick={() => fileRef.current?.click()}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-white/15 py-2 text-[11px] text-white/70 hover:bg-white/[0.04] disabled:opacity-40"
              >
                {uploading ? (
                  <Loader2 className="animate-spin" size={12} />
                ) : (
                  <Upload size={12} />
                )}
                {baseUrl ? "Trocar imagem" : "Enviar imagem"}
              </button>
              {baseChoices.length > 0 && (
                <select
                  className={STORYBOARD_SELECT_CLASS}
                  disabled={busy}
                  value={baseChoices.some((block) => block.resultUrl === baseUrl) ? baseUrl ?? "" : ""}
                  onChange={(event) => setBaseUrl(event.target.value || null)}
                >
                  <option value="">Ou uma cena já pronta</option>
                  {baseChoices.map((block, index) => (
                    <option key={block.id} value={block.resultUrl ?? ""}>
                      {`${index + 1}. ${(block.prompt || "Imagem").slice(0, 42)}`}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(event) => void uploadBase(event.target.files?.[0])}
          />
          <p className="mt-1 text-[10px] text-white/35">
            A mesma foto entra como referência de todos os prompts.
          </p>
        </div>

        <textarea
          className="h-40 w-full resize-y rounded-lg border border-white/[0.08] bg-[#151b26] px-2 py-2 text-xs text-white outline-none placeholder:text-white/25"
          placeholder={"Prompt da cena 1\n\nPrompt da cena 2\n\nOu um prompt por linha"}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={busy}
        />
        <p className="text-[10px] leading-relaxed text-white/35">
          Separe prompts longos com uma linha em branco, ou com uma linha só de ---.
          Sem linha em branco, cada linha vira uma imagem. Máximo {BULK_LIMIT}.
        </p>

        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10px] text-white/40">Formato</span>
            <select
              className={STORYBOARD_SELECT_CLASS}
              value={aspectRatio}
              onChange={(event) => setAspectRatio(event.target.value)}
              disabled={busy}
            >
              {ASPECT_RATIOS.map((ratio) => (
                <option key={ratio} value={ratio}>
                  {ratio === "1:1" ? "1:1 · Feed" : ratio === "9:16" ? "9:16 · Stories" : ratio}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] text-white/40">Resolução</span>
            <select
              className={STORYBOARD_SELECT_CLASS}
              value={resolution}
              onChange={(event) => setResolution(event.target.value)}
              disabled={busy}
            >
              {IMAGE_RESOLUTIONS.map((item) => (
                <option key={item} value={item}>
                  {item} · {estimateKieCredits("image", item)} cr
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="text-[11px] text-white/50">
          {prompts.length} prompt{prompts.length === 1 ? "" : "s"}
          {parsedCount > BULK_LIMIT ? ` (só os ${BULK_LIMIT} primeiros)` : ""} ·{" "}
          {formatKieCredits(totalCost)} créditos
        </p>

        {batchIds.length > 0 && (
          <p className="text-[11px] text-white/50">
            Nesta leva: {batchReady.length} pronta{batchReady.length === 1 ? "" : "s"} de{" "}
            {batchIds.length}
            {batchBlocks.some((block) => block.status === "fail")
              ? ` · ${batchBlocks.filter((block) => block.status === "fail").length} falhou`
              : ""}
          </p>
        )}

        {progress && <p className="text-[11px] text-sky-200">{progress}</p>}
        {error && <p className="text-[11px] text-red-300">{error}</p>}

        <button
          type="button"
          disabled={busy || prompts.length === 0}
          onClick={() => void generateAll()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-2.5 text-xs font-medium text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="animate-spin" size={14} /> : null}
          {busy
            ? "Gerando…"
            : `Gerar ${prompts.length || ""} imagem${prompts.length === 1 ? "" : "ns"}`}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={downloading || batchReady.length === 0}
            onClick={() => void download("batch")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] py-2 text-[11px] text-white/80 hover:bg-white/[0.04] disabled:opacity-40"
          >
            <Download size={13} />
            Leva ({batchReady.length})
          </button>
          <button
            type="button"
            disabled={downloading || allReady.length === 0}
            onClick={() => void download("all")}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/[0.08] py-2 text-[11px] text-white/80 hover:bg-white/[0.04] disabled:opacity-40"
          >
            <Download size={13} />
            Todas ({allReady.length})
          </button>
        </div>
        <p className="text-[10px] text-white/30">
          No Chrome, as imagens vão para uma pasta. Nos outros navegadores, sai um ZIP.
        </p>
      </div>
    </aside>
  );
}
