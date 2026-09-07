"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cable,
  ChevronDown,
  Crosshair,
  Diamond,
  Hand,
  ImageIcon,
  Loader2,
  Plus,
  Sparkles,
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
  estimateKieCredits,
  formatKieCredits,
  getStoryboardModel,
  type StoryboardModelKey,
} from "@/lib/kie/models";
import { cn } from "@/lib/utils";

const BLOCK_W = 320;

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
  sourceBlockId: string | null;
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
  const canvasPan = useRef<{ ox: number; oy: number } | null>(null);
  const blockDrag = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    lastX: number;
    lastY: number;
  } | null>(null);

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

  useEffect(() => {
    const pending = blocks.filter(
      (b) => b.status === "queued" || b.status === "generating"
    );
    if (!pending.length) return;

    const t = setInterval(async () => {
      let changed = false;
      for (const b of pending) {
        try {
          const res = await fetch(
            `/api/admin/storyboards/${id}/blocks/${b.id}`
          );
          const data = await res.json();
          if (res.ok && data.block) {
            changed = true;
            setBlocks((prev) =>
              prev.map((x) => (x.id === b.id ? data.block : x))
            );
          }
        } catch {
          /* ignore */
        }
      }
      if (changed) {
        try {
          const res = await fetch("/api/admin/credits");
          const data = await res.json();
          if (res.ok) setCredits(data.credits ?? 0);
        } catch {
          /* ignore */
        }
      }
    }, 3000);

    return () => clearInterval(t);
  }, [blocks, id]);

  async function spawnBlock(
    mode: "image" | "video" | "any",
    source?: Block
  ) {
    const defaultKey =
      mode === "video"
        ? "img2video_hq"
        : mode === "image"
          ? "image"
          : "image";

    const baseX = source ? source.positionX + BLOCK_W + 80 : 120 + blocks.length * 36;
    const baseY = source ? source.positionY : 100 + blocks.length * 28;

    try {
      const res = await fetch(`/api/admin/storyboards/${id}/blocks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelKey: defaultKey,
          positionX: baseX,
          positionY: baseY,
          sourceBlockId: source?.id ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar bloco");
      setBlocks((prev) => [...prev, data.block]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao criar bloco");
    }
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (tool !== "pan") return;
    if ((e.target as HTMLElement).closest("[data-block]")) return;
    canvasPan.current = { ox: e.clientX - pan.x, oy: e.clientY - pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (canvasPan.current) {
      setPan({
        x: e.clientX - canvasPan.current.ox,
        y: e.clientY - canvasPan.current.oy,
      });
      return;
    }
    if (blockDrag.current && tool === "select") {
      const dx = (e.clientX - blockDrag.current.startX) / zoom;
      const dy = (e.clientY - blockDrag.current.startY) / zoom;
      const id = blockDrag.current.id;
      const nx = blockDrag.current.origX + dx;
      const ny = blockDrag.current.origY + dy;
      blockDrag.current.lastX = nx;
      blockDrag.current.lastY = ny;
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === id ? { ...b, positionX: nx, positionY: ny } : b
        )
      );
    }
  }

  async function onCanvasPointerUp() {
    if (blockDrag.current) {
      const { id, lastX, lastY } = blockDrag.current;
      blockDrag.current = null;
      await fetch(`/api/admin/storyboards/${id}/blocks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          positionX: lastX,
          positionY: lastY,
        }),
      });
      return;
    }
    canvasPan.current = null;
  }

  function startBlockDrag(e: React.PointerEvent, block: Block) {
    if (tool !== "select") return;
    if ((e.target as HTMLElement).closest("button,select,textarea,input,a,video")) {
      return;
    }
    e.stopPropagation();
    blockDrag.current = {
      id: block.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: block.positionX,
      origY: block.positionY,
      lastX: block.positionX,
      lastY: block.positionY,
    };
  }

  const connections = useMemo(() => {
    return blocks
      .filter((b) => b.sourceBlockId)
      .map((b) => {
        const src = blocks.find((x) => x.id === b.sourceBlockId);
        if (!src) return null;
        return { from: src, to: b };
      })
      .filter(Boolean) as { from: Block; to: Block }[];
  }, [blocks]);

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
            Créditos disponíveis {formatKieCredits(credits)}
          </div>
          <a
            href="https://kie.ai/billing"
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-white/[0.1] px-3 py-1.5 text-xs text-white/70 hover:text-white"
          >
            Comprar
          </a>
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
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={() => void onCanvasPointerUp()}
      >
        <div
          className="absolute inset-0 origin-center"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          }}
        >
          <svg className="pointer-events-none absolute inset-0 h-[4000px] w-[4000px] overflow-visible">
            {connections.map(({ from, to }) => {
              const x1 = from.positionX + BLOCK_W;
              const y1 = from.positionY + 118;
              const x2 = to.positionX;
              const y2 = to.positionY + 118;
              const cx = (x1 + x2) / 2;
              return (
                <path
                  key={`${from.id}-${to.id}`}
                  d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                  fill="none"
                  stroke="rgba(56,189,248,0.5)"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {blocks.length === 0 && (
            <div className="flex h-full min-h-[60vh] items-center justify-center text-sm text-white/30">
              Adicione um bloco na barra — crie imagem e pluge no vídeo
            </div>
          )}

          {blocks.map((b) => (
            <FlowBlock
              key={b.id}
              block={b}
              storyboardId={id}
              allBlocks={blocks}
              onChange={(next) =>
                setBlocks((prev) =>
                  prev.map((x) => (x.id === next.id ? next : x))
                )
              }
              onCredits={(c) => setCredits(c)}
              onDelete={() =>
                setBlocks((prev) => prev.filter((x) => x.id !== b.id))
              }
              onPlugVideo={() => void spawnBlock("video", b)}
              onDragStart={(e) => startBlockDrag(e, b)}
            />
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-4">
        <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/[0.08] bg-black/70 px-2 py-1.5 shadow-2xl backdrop-blur-md">
          <ToolBtn title="Novo bloco" onClick={() => void spawnBlock("any")}>
            <Plus size={16} />
          </ToolBtn>
          <ToolBtn
            title="Criar imagem"
            onClick={() => void spawnBlock("image")}
          >
            <ImageIcon size={16} />
          </ToolBtn>
          <ToolBtn
            title="Criar vídeo"
            onClick={() => void spawnBlock("video")}
          >
            <Video size={16} />
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

function Port({ side }: { side: "left" | "right" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute top-[118px] z-10 flex h-5 w-5 -translate-y-1/2 items-center justify-center",
        side === "left" ? "-left-2.5" : "-right-2.5"
      )}
    >
      <span className="absolute h-5 w-5 rounded-full bg-sky-400/15 blur-[2px]" />
      <span className="relative h-3 w-3 rounded-full border-2 border-sky-300/90 bg-[#0a0e16] shadow-[0_0_10px_rgba(56,189,248,0.45)]" />
    </div>
  );
}

function FlowBlock({
  block,
  storyboardId,
  allBlocks,
  onChange,
  onCredits,
  onDelete,
  onPlugVideo,
  onDragStart,
}: {
  block: Block;
  storyboardId: string;
  allBlocks: Block[];
  onChange: (b: Block) => void;
  onCredits: (n: number) => void;
  onDelete: () => void;
  onPlugVideo: () => void;
  onDragStart: (e: React.PointerEvent) => void;
}) {
  const isDraft = block.status === "draft" || block.status === "fail";
  const pending =
    block.status === "queued" || block.status === "generating";
  const done = block.status === "success" && block.resultUrl;
  const model = getStoryboardModel(block.modelKey);
  const cost = estimateKieCredits(block.modelKey, block.resolution);

  async function remove() {
    if (!confirm("Remover este bloco?")) return;
    await fetch(
      `/api/admin/storyboards/${storyboardId}/blocks/${block.id}`,
      { method: "DELETE" }
    );
    onDelete();
  }

  return (
    <div
      data-block
      className="absolute overflow-visible"
      style={{
        left: block.positionX,
        top: block.positionY,
        width: BLOCK_W,
      }}
      onPointerDown={onDragStart}
    >
      <Port side="left" />
      <Port side="right" />

      <div className="group relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-gradient-to-b from-[#121821] to-[#0a0d14] shadow-[0_20px_50px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.04]">
        <button
          type="button"
          onClick={() => void remove()}
          className="absolute right-2.5 top-2.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-black/45 text-white/45 opacity-0 backdrop-blur transition-opacity hover:bg-black/70 hover:text-white group-hover:opacity-100"
        >
          <X size={13} />
        </button>

        {isDraft ? (
          <DraftForm
            block={block}
            storyboardId={storyboardId}
            allBlocks={allBlocks}
            cost={cost}
            onChange={onChange}
            onCredits={onCredits}
          />
        ) : (
          <div>
            <div className="relative aspect-[4/3] overflow-hidden bg-[#151b26]">
              <div
                className="absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.08) 1px, transparent 0)",
                  backgroundSize: "14px 14px",
                }}
              />
              {pending ? (
                <div className="relative z-[1] flex h-full flex-col items-center justify-center gap-2 text-white/45">
                  <Loader2 className="animate-spin text-sky-300" size={24} />
                  <span className="text-xs tracking-wide">Gerando cena...</span>
                </div>
              ) : done ? (
                model?.kind === "video" ? (
                  <video
                    src={block.resultUrl!}
                    controls
                    className="relative z-[1] h-full w-full object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={block.resultUrl!}
                    alt=""
                    className="relative z-[1] h-full w-full object-cover"
                  />
                )
              ) : (
                <p className="relative z-[1] flex h-full items-center justify-center px-4 text-center text-xs text-red-300/80">
                  {block.errorMessage || "Sem resultado"}
                </p>
              )}
              <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[2]">
                <div className="truncate rounded-full bg-sky-500/90 px-3 py-1.5 text-center text-[11px] font-medium text-white shadow-lg shadow-sky-900/30 backdrop-blur">
                  {model?.label ?? block.modelKey}
                </div>
              </div>
            </div>
            <div className="space-y-2 p-3.5">
              <p className="line-clamp-2 text-[12px] leading-relaxed text-white/45">
                {block.prompt}
              </p>
              {done && model?.kind === "image" && (
                <button
                  type="button"
                  onClick={onPlugVideo}
                  className="flex w-full items-center justify-center gap-1.5 rounded-full border border-sky-400/25 bg-sky-400/10 px-3 py-2.5 text-[12px] font-medium text-sky-200 transition-colors hover:bg-sky-400/20"
                >
                  <Cable size={13} />
                  Plugar em vídeo
                </button>
              )}
              {done && (
                <p className="text-center text-[10px] text-white/30">
                  −{formatKieCredits(block.creditsCharged)} créditos Kie
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DraftForm({
  block,
  storyboardId,
  allBlocks,
  cost,
  onChange,
  onCredits,
}: {
  block: Block;
  storyboardId: string;
  allBlocks: Block[];
  cost: number;
  onChange: (b: Block) => void;
  onCredits: (n: number) => void;
}) {
  const [modelKey, setModelKey] = useState<StoryboardModelKey>(
    (block.modelKey as StoryboardModelKey) || "image"
  );
  const [prompt, setPrompt] = useState(block.prompt);
  const [aspectRatio, setAspectRatio] = useState(block.aspectRatio || "auto");
  const [resolution, setResolution] = useState(block.resolution || "1K");
  const [refUrls, setRefUrls] = useState<string[]>(block.referenceUrls ?? []);
  const [sourceBlockId, setSourceBlockId] = useState<string | null>(
    block.sourceBlockId
  );
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(block.errorMessage || "");
  const fileRef = useRef<HTMLInputElement>(null);

  const model = getStoryboardModel(modelKey);
  const liveCost = estimateKieCredits(modelKey, resolution);
  const isImage = model?.kind === "image";
  const plugSources = allBlocks.filter(
    (b) => b.id !== block.id && b.status === "success" && b.resultUrl
  );

  useEffect(() => {
    if (model?.defaultResolution && modelKey !== block.modelKey) {
      setResolution(model.defaultResolution);
    }
  }, [model?.defaultResolution, modelKey, block.modelKey]);

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

  function plugFrom(sourceId: string) {
    const src = allBlocks.find((b) => b.id === sourceId);
    if (!src?.resultUrl) return;
    setSourceBlockId(sourceId);
    setRefUrls((prev) =>
      prev.includes(src.resultUrl!) ? prev : [src.resultUrl!, ...prev]
    );
  }

  async function submit() {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch(
        `/api/admin/storyboards/${storyboardId}/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockId: block.id,
            modelKey,
            prompt,
            aspectRatio,
            resolution,
            referenceUrls: refUrls,
            sourceBlockId,
          }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha na geração");
      onChange(data.block);
      if (typeof data.credits === "number") onCredits(data.credits);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {/* Preview stage */}
      <div className="relative aspect-[4/3] cursor-grab overflow-hidden bg-[#1a2230] active:cursor-grabbing">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(160deg, #2a3344 0%, #151b26 45%, #0f131c 100%)",
          }}
        />
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.1) 1px, transparent 0)",
            backgroundSize: "16px 16px",
          }}
        />

        {refUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={refUrls[0]}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-50"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            {model?.kind === "video" ? (
              <Video className="text-white/15" size={40} strokeWidth={1.25} />
            ) : (
              <ImageIcon className="text-white/15" size={40} strokeWidth={1.25} />
            )}
          </div>
        )}

        {/* Model pill (banner) */}
        <div className="absolute inset-x-0 top-1/2 z-[2] flex -translate-y-1/2 justify-center px-4">
          <div className="relative w-full max-w-[92%]">
            <select
              className="w-full appearance-none truncate rounded-full border border-white/10 bg-sky-500 py-2.5 pl-4 pr-9 text-center text-[12px] font-medium text-white shadow-[0_8px_24px_rgba(14,165,233,0.35)] outline-none transition hover:bg-sky-400"
              value={modelKey}
              onChange={(e) => setModelKey(e.target.value as StoryboardModelKey)}
            >
              {STORYBOARD_MODELS.map((m) => (
                <option key={m.key} value={m.key} className="bg-[#0f141d] text-white">
                  {m.label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/80"
            />
          </div>
        </div>

        {/* Refs strip */}
        {(refUrls.length > 0 || plugSources.length > 0) && (
          <div className="absolute inset-x-0 bottom-0 z-[2] flex items-end gap-1.5 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-8">
            {refUrls.map((url) => (
              <div
                key={url}
                className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-white/20 shadow"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 text-transparent transition hover:bg-black/55 hover:text-white"
                  onClick={() => setRefUrls((p) => p.filter((u) => u !== url))}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              disabled={uploading || refUrls.length >= 16}
              onClick={() => fileRef.current?.click()}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-dashed border-white/25 bg-white/5 text-white/55 hover:text-white"
            >
              {uploading ? (
                <Loader2 className="animate-spin" size={12} />
              ) : (
                <Plus size={14} />
              )}
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2.5 p-3.5">
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => void uploadFiles(e.target.files)}
          />
          {refUrls.length === 0 && (
            <button
              type="button"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/50 transition hover:border-white/15 hover:text-white/80"
            >
              <Upload size={11} />
              Referência
            </button>
          )}
          {plugSources.length > 0 && (
            <div className="relative min-w-0 flex-1">
              <Cable
                size={11}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sky-300/70"
              />
              <select
                className="w-full appearance-none truncate rounded-full border border-sky-400/20 bg-sky-400/10 py-1 pl-7 pr-6 text-[11px] text-sky-100 outline-none"
                value={sourceBlockId ?? ""}
                onChange={(e) => {
                  if (!e.target.value) {
                    setSourceBlockId(null);
                    return;
                  }
                  plugFrom(e.target.value);
                }}
              >
                <option value="">Plugar cena...</option>
                {plugSources.map((s) => (
                  <option key={s.id} value={s.id}>
                    {(getStoryboardModel(s.modelKey)?.label ?? s.modelKey).slice(
                      0,
                      22
                    )}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {isImage && (
          <div className="grid grid-cols-2 gap-2">
            <label className="space-y-1">
              <span className="px-0.5 text-[10px] tracking-wide text-white/35 uppercase">
                Proporção
              </span>
              <select
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-2 text-[12px] text-white/85 outline-none focus:border-sky-400/40"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
              >
                {ASPECT_RATIOS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="px-0.5 text-[10px] tracking-wide text-white/35 uppercase">
                Resolução
              </span>
              <select
                className="w-full rounded-xl border border-white/[0.07] bg-white/[0.03] px-2.5 py-2 text-[12px] text-white/85 outline-none focus:border-sky-400/40"
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
              >
                {IMAGE_RESOLUTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r} · {estimateKieCredits(modelKey, r)} cr
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <textarea
          className="min-h-[72px] w-full resize-y rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2.5 text-[12px] leading-relaxed text-white/90 outline-none placeholder:text-white/25 focus:border-sky-400/35"
          rows={3}
          placeholder="Descreva o que você quer gerar..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />

        {err && (
          <p className="rounded-lg border border-red-400/20 bg-red-500/10 px-2.5 py-1.5 text-[11px] text-red-200">
            {err}
          </p>
        )}

        <button
          type="button"
          disabled={busy || !prompt.trim()}
          onClick={() => void submit()}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-b from-sky-400 to-sky-600 py-3 text-[13px] font-semibold text-white shadow-[0_10px_28px_rgba(14,165,233,0.35)] transition hover:from-sky-300 hover:to-sky-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          {busy ? (
            <Loader2 className="animate-spin" size={15} />
          ) : (
            <>
              <Sparkles size={14} className="opacity-90" />
              Gerar Criativo ({liveCost || cost} créditos)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
