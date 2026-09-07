"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Crosshair,
  Diamond,
  Hand,
  ImageIcon,
  Loader2,
  Plus,
  Upload,
  Video,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  ASPECT_RATIOS,
  IMAGE_RESOLUTIONS,
  STORYBOARD_MODELS,
  getStoryboardModel,
  type StoryboardModelKey,
} from "@/lib/kie/models";
import { cn } from "@/lib/utils";

type Block = {
  id: string;
  modelKey: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  referenceUrls: string[];
  positionX: number;
  positionY: number;
  status: string;
  resultUrl: string | null;
  resultUrls: string[];
  errorMessage: string | null;
  creditsCharged: number;
};

type Board = {
  id: string;
  name: string;
};

export function StoryboardEditor({ id }: { id: string }) {
  const [board, setBoard] = useState<Board | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [tool, setTool] = useState<"select" | "pan">("select");
  const [showCreate, setShowCreate] = useState(false);
  const [createMode, setCreateMode] = useState<"image" | "video" | "any">("any");
  const dragging = useRef<{ ox: number; oy: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/storyboards/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setBoard(data.storyboard);
      setBlocks(data.blocks ?? []);
      setCredits(data.credits ?? 0);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  // Poll generating blocks
  useEffect(() => {
    const pending = blocks.filter(
      (b) => b.status === "queued" || b.status === "generating"
    );
    if (!pending.length) return;

    const t = setInterval(async () => {
      for (const b of pending) {
        try {
          const res = await fetch(
            `/api/admin/storyboards/${id}/blocks/${b.id}`
          );
          const data = await res.json();
          if (res.ok && data.block) {
            setBlocks((prev) =>
              prev.map((x) => (x.id === b.id ? data.block : x))
            );
          }
        } catch {
          /* ignore */
        }
      }
      try {
        const res = await fetch("/api/admin/credits");
        const data = await res.json();
        if (res.ok) setCredits(data.credits ?? 0);
      } catch {
        /* ignore */
      }
    }, 3500);

    return () => clearInterval(t);
  }, [blocks, id]);

  function openCreate(mode: "image" | "video" | "any" = "any") {
    setCreateMode(mode);
    setShowCreate(true);
  }

  function onPointerDown(e: React.PointerEvent) {
    if (tool !== "pan") return;
    dragging.current = { ox: e.clientX - pan.x, oy: e.clientY - pan.y };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setPan({
      x: e.clientX - dragging.current.ox,
      y: e.clientY - dragging.current.oy,
    });
  }

  function onPointerUp() {
    dragging.current = null;
  }

  async function handleGenerated(block: Block, nextCredits: number) {
    setBlocks((prev) => [...prev, block]);
    setCredits(nextCredits);
    setShowCreate(false);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#07090d] text-white/50">
        <Loader2 className="animate-spin" size={22} />
      </div>
    );
  }

  return (
    <div className="relative flex h-screen flex-col overflow-hidden bg-[#07090d] text-white">
      <header className="relative z-20 flex items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link
            href="/storyboards"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-white/70 hover:text-white"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <p className="text-[10px] font-medium tracking-[0.18em] text-white/35 uppercase">
              Storyboards
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              {board?.name ?? "Storyboard"}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs text-sky-200">
            <Diamond size={12} className="fill-sky-300/80 text-sky-300" />
            Créditos disponíveis {credits}
          </div>
          <Link
            href="/perfil"
            className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-white/70 hover:text-white"
          >
            Comprar
          </Link>
        </div>
      </header>

      {error && (
        <p className="relative z-20 mx-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 sm:mx-6">
          {error}
        </p>
      )}

      <div
        className={cn(
          "relative flex-1 overflow-hidden",
          tool === "pan" ? "cursor-grab active:cursor-grabbing" : "cursor-default"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <div
          className="absolute inset-0 origin-center transition-transform duration-150"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          {blocks.length === 0 && !showCreate && (
            <div className="flex h-full min-h-[60vh] items-center justify-center text-sm text-white/30">
              Use a barra abaixo para criar uma imagem ou vídeo
            </div>
          )}

          {blocks.map((b) => (
            <BlockCard key={b.id} block={b} storyboardId={id} onDeleted={load} />
          ))}
        </div>
      </div>

      {showCreate && (
        <CreationBlock
          storyboardId={id}
          mode={createMode}
          credits={credits}
          onClose={() => setShowCreate(false)}
          onGenerated={handleGenerated}
        />
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-black/70 px-2 py-1.5 shadow-2xl backdrop-blur-md">
          <ToolBtn
            title="Upload (URL no bloco)"
            onClick={() => openCreate("any")}
          >
            <Upload size={16} />
          </ToolBtn>
          <ToolBtn title="Criar imagem" onClick={() => openCreate("image")}>
            <ImageIcon size={16} />
          </ToolBtn>
          <ToolBtn title="Criar vídeo" onClick={() => openCreate("video")}>
            <Video size={16} />
          </ToolBtn>
          <ToolBtn title="Novo bloco" onClick={() => openCreate("any")}>
            <Plus size={16} />
          </ToolBtn>
          <div className="mx-1 h-5 w-px bg-white/10" />
          <ToolBtn
            title="Mover canvas"
            active={tool === "pan"}
            onClick={() => setTool(tool === "pan" ? "select" : "pan")}
          >
            <Hand size={16} />
          </ToolBtn>
          <div className="mx-1 h-5 w-px bg-white/10" />
          <ToolBtn
            title="Zoom out"
            onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.1).toFixed(2)))}
          >
            <ZoomOut size={16} />
          </ToolBtn>
          <ToolBtn
            title="Zoom in"
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
          >
            <ZoomIn size={16} />
          </ToolBtn>
          <ToolBtn
            title="Centralizar"
            onClick={() => {
              setZoom(1);
              setPan({ x: 0, y: 0 });
            }}
          >
            <Crosshair size={16} />
          </ToolBtn>
          <span className="px-2 text-xs tabular-nums text-white/45">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}

function ToolBtn({
  children,
  onClick,
  title,
  active,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-xl text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white",
        active && "bg-white/[0.08] text-white"
      )}
    >
      {children}
    </button>
  );
}

function BlockCard({
  block,
  storyboardId,
  onDeleted,
}: {
  block: Block;
  storyboardId: string;
  onDeleted: () => void;
}) {
  const model = getStoryboardModel(block.modelKey);
  const pending =
    block.status === "queued" || block.status === "generating";

  async function remove() {
    if (!confirm("Remover este bloco?")) return;
    await fetch(`/api/admin/storyboards/${storyboardId}/blocks/${block.id}`, {
      method: "DELETE",
    });
    onDeleted();
  }

  return (
    <div
      className="absolute w-[280px] overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c1018] shadow-xl"
      style={{ left: block.positionX, top: block.positionY }}
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-3 py-2">
        <span className="truncate text-xs text-white/50">
          {model?.label ?? block.modelKey}
        </span>
        <button
          type="button"
          onClick={() => void remove()}
          className="text-white/35 hover:text-white"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex aspect-square items-center justify-center bg-white/[0.02]">
        {pending ? (
          <div className="flex flex-col items-center gap-2 text-white/40">
            <Loader2 className="animate-spin" size={22} />
            <span className="text-xs">Gerando...</span>
          </div>
        ) : block.resultUrl ? (
          model?.kind === "video" ? (
            <video
              src={block.resultUrl}
              controls
              className="h-full w-full object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={block.resultUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <p className="px-3 text-center text-xs text-red-300/80">
            {block.errorMessage || "Sem resultado"}
          </p>
        )}
      </div>

      <p className="line-clamp-2 px-3 py-2 text-xs text-white/40">
        {block.prompt}
      </p>
    </div>
  );
}

function CreationBlock({
  storyboardId,
  mode,
  credits,
  onClose,
  onGenerated,
}: {
  storyboardId: string;
  mode: "image" | "video" | "any";
  credits: number;
  onClose: () => void;
  onGenerated: (block: Block, credits: number) => void;
}) {
  const models =
    mode === "image"
      ? STORYBOARD_MODELS.filter((m) => m.kind === "image")
      : mode === "video"
        ? STORYBOARD_MODELS.filter((m) => m.kind === "video")
        : STORYBOARD_MODELS;

  const [modelKey, setModelKey] = useState<StoryboardModelKey>(
    (models[0]?.key as StoryboardModelKey) || "image"
  );
  const [prompt, setPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [resolution, setResolution] = useState("1K");
  const [refUrls, setRefUrls] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const model = getStoryboardModel(modelKey);
  const cost = model?.credits ?? 10;
  const isImage = model?.kind === "image";

  useEffect(() => {
    if (model?.defaultResolution) setResolution(model.defaultResolution);
  }, [model?.defaultResolution]);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setErr("");
    try {
      const next: string[] = [];
      for (const file of Array.from(files).slice(0, 16 - refUrls.length)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/storyboards/upload", {
          method: "POST",
          body: form,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Falha no upload");
        next.push(data.url as string);
      }
      setRefUrls((prev) => [...prev, ...next].slice(0, 16));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro no upload");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function submit() {
    setBusy(true);
    setErr("");

    try {
      const res = await fetch(`/api/admin/storyboards/${storyboardId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelKey,
          prompt,
          aspectRatio,
          resolution,
          referenceUrls: refUrls,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na geração");
      onGenerated(data.block, data.credits ?? credits - cost);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/50 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#0b0f16] p-4 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-medium text-white/90">Bloco de criação</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <label className="mb-1 block text-xs text-white/40">Modelo</label>
        <select
          className="mb-3 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
          value={modelKey}
          onChange={(e) => setModelKey(e.target.value as StoryboardModelKey)}
        >
          {models.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>

        <p className="mb-2 text-xs text-sky-400/90">
          {model?.requiresReference
            ? "Conecte ao menos 1 imagem de referência"
            : "Conecte até 16 imagens de referência (opcional)"}
        </p>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void uploadFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={uploading || refUrls.length >= 16}
          onClick={() => fileRef.current?.click()}
          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/[0.02] px-3 py-3 text-xs text-white/55 hover:border-white/25 hover:text-white/80 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <Upload size={14} />
          )}
          {uploading ? "Enviando..." : "Enviar imagens"}
        </button>

        {refUrls.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {refUrls.map((url) => (
              <div
                key={url}
                className="relative h-14 w-14 overflow-hidden rounded-lg border border-white/10"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded bg-black/70 p-0.5 text-white/80"
                  onClick={() =>
                    setRefUrls((prev) => prev.filter((u) => u !== url))
                  }
                >
                  <X size={10} />
                </button>
              </div>
            ))}
          </div>
        )}

        {isImage && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs text-white/40">
                Proporção
              </label>
              <select
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-sm text-white outline-none"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                {ASPECT_RATIOS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-white/40">
                Resolução
              </label>
              <select
                className="w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-2 text-sm text-white outline-none"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                {IMAGE_RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <label className="mb-1 block text-xs text-white/40">Prompt</label>
        <textarea
          className="mb-4 w-full rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/25"
          rows={4}
          placeholder="Descreva o que você quer gerar..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {err && (
          <p className="mb-3 text-xs text-red-300">{err}</p>
        )}

        <button
          type="button"
          disabled={busy || !prompt.trim()}
          onClick={() => void submit()}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 py-3 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            `Gerar Criativo (${cost} créditos)`
          )}
        </button>
      </div>
    </div>
  );
}
