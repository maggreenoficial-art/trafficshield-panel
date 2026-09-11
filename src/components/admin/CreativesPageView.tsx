"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Download,
  Eraser,
  FileText,
  Folder,
  FolderOpen,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import {
  panelCard,
  panelPillBtn,
  panelSearch,
} from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import {
  downloadBlob,
  stripImageInBrowser,
} from "@/lib/media/strip-image-client";

type FolderItem = {
  id: string;
  name: string;
  count?: number;
};

type Creative = {
  id: string;
  mediaType: "image" | "video";
  url: string;
  thumbnailUrl: string | null;
  prompt: string | null;
  createdAt: string;
  expiresAt: string;
};

type StripJob = {
  id: string;
  name: string;
  status: "pending" | "done" | "error";
  error?: string;
};

export function CreativesPageView() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, unfiled: 0 });
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [folder, setFolder] = useState<string>("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stripJobs, setStripJobs] = useState<StripJob[]>([]);
  const [stripping, setStripping] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      params.set("folder", folder);
      params.set("type", type);
      const res = await fetch(`/api/admin/creatives?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro");
      setFolders(data.folders ?? []);
      setCounts(data.counts ?? { all: 0, unfiled: 0 });
      setCreatives(data.creatives ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [folder, type]);

  useEffect(() => {
    void load();
  }, [load]);

  async function newFolder() {
    const name = prompt("Nome da pasta");
    if (!name?.trim()) return;
    const res = await fetch("/api/admin/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_folder", name }),
    });
    if (res.ok) void load();
  }

  async function deleteAll() {
    if (!confirm("Excluir TODOS os criativos?")) return;
    await fetch("/api/admin/creatives", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_all" }),
    });
    void load();
  }

  async function stripFiles(files: FileList | File[] | null) {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => {
      if (/^image\/(jpeg|jpg|png|webp)$/i.test(f.type)) return true;
      return /\.(jpe?g|png|webp)$/i.test(f.name);
    });
    if (!list.length) {
      setError("Selecione imagens JPEG, PNG ou WEBP.");
      return;
    }

    setStripping(true);
    setError("");
    const jobs: StripJob[] = list.map((f, i) => ({
      id: `${Date.now()}-${i}`,
      name: f.name,
      status: "pending",
    }));
    setStripJobs(jobs);

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const jobId = jobs[i].id;
      try {
        const cleaned = await stripImageInBrowser(file);
        downloadBlob(cleaned.blob, cleaned.filename);
        setStripJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "done" } : j
          )
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro";
        setStripJobs((prev) =>
          prev.map((j) =>
            j.id === jobId ? { ...j, status: "error", error: msg } : j
          )
        );
      }
    }

    setStripping(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const filtered = creatives.filter((c) => {
    if (!query.trim()) return true;
    return (c.prompt || "").toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Meus Criativos"
        subtitle="Limpe metadados antes de subir no Ads e organize sua biblioteca."
      />

      <section className={cn(panelCard, "space-y-4 p-5")}>
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-lg bg-sky-500/15 p-2 text-sky-300">
            <Eraser size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-medium text-white">
              Remover metadados da imagem
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-white/45">
              Tira EXIF, GPS, software e rastros de edição. Use antes de enviar o
              criativo para o Meta/Google — reduz risco de vínculo com contas
              anteriores. O arquivo limpo baixa automaticamente.
            </p>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => void stripFiles(e.target.files)}
        />

        <button
          type="button"
          disabled={stripping}
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-sm text-white/55 transition hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-white/80 disabled:opacity-50"
        >
          {stripping ? (
            <Loader2 className="animate-spin text-sky-300" size={22} />
          ) : (
            <Upload size={22} className="text-white/35" />
          )}
          {stripping
            ? "Limpando e baixando..."
            : "Arraste ou clique para selecionar imagens"}
          <span className="text-[11px] text-white/30">
            JPEG, PNG ou WEBP · até 30MB cada · várias de uma vez
          </span>
        </button>

        {stripJobs.length > 0 && (
          <ul className="space-y-1.5">
            {stripJobs.map((j) => (
              <li
                key={j.id}
                className="flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/55"
              >
                {j.status === "done" ? (
                  <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                ) : j.status === "error" ? (
                  <Trash2 size={14} className="shrink-0 text-red-400" />
                ) : (
                  <Loader2
                    size={14}
                    className="shrink-0 animate-spin text-sky-300"
                  />
                )}
                <span className="min-w-0 flex-1 truncate">{j.name}</span>
                {j.status === "done" && (
                  <span className="inline-flex items-center gap-1 text-emerald-400/90">
                    <Download size={12} /> limpo
                  </span>
                )}
                {j.status === "error" && (
                  <span className="truncate text-red-300">{j.error}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium tracking-[0.15em] text-white/40 uppercase">
              Pastas
            </p>
          </div>
          <button
            type="button"
            onClick={() => void newFolder()}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-amber-400 px-3 py-2 text-sm font-medium text-black"
          >
            <Plus size={15} />
            Nova pasta
          </button>

          <nav className="space-y-1">
            <FolderBtn
              active={folder === "all"}
              onClick={() => setFolder("all")}
              icon={<FolderOpen size={15} />}
              label="Todos os criativos"
              count={counts.all}
            />
            <FolderBtn
              active={folder === "none"}
              onClick={() => setFolder("none")}
              icon={<FileText size={15} />}
              label="Sem pasta"
              count={counts.unfiled}
            />
            {folders.map((f) => (
              <FolderBtn
                key={f.id}
                active={folder === f.id}
                onClick={() => setFolder(f.id)}
                icon={<Folder size={15} />}
                label={f.name}
                count={f.count ?? 0}
              />
            ))}
          </nav>

          <p className="flex items-center gap-1.5 pt-4 text-xs text-white/35">
            <Clock size={12} />
            Arquivos da biblioteca expiram após 7 dias
          </p>
        </aside>

        <div className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className={cn(panelSearch, "flex-1")}>
              <Search size={16} className="text-white/35" />
              <input
                className="w-full bg-transparent text-sm outline-none placeholder:text-white/30"
                placeholder="Buscar criativos..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <select
              className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white/70 outline-none"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="all">Todos os tipos</option>
              <option value="image">Imagens</option>
              <option value="video">Vídeos</option>
            </select>
            <button
              type="button"
              className={panelPillBtn}
              onClick={() => void load()}
              title="Atualizar"
            >
              <RefreshCw size={15} />
            </button>
            <button
              type="button"
              onClick={() => void deleteAll()}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 px-3 py-2 text-sm text-red-300 hover:bg-red-500/10"
            >
              <Trash2 size={14} />
              Excluir Todos
            </button>
          </div>

          {error && <p className="text-sm text-red-300">{error}</p>}

          {loading ? (
            <p className="text-sm text-white/40">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div
              className={cn(
                panelCard,
                "flex items-center justify-center px-6 py-20 text-sm text-white/40"
              )}
            >
              Nenhum criativo nesta pasta. Use o limpador acima para preparar
              imagens do Ads.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((c) => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(panelCard, "overflow-hidden")}
                >
                  <div className="flex aspect-video items-center justify-center bg-white/[0.03]">
                    {c.mediaType === "video" ? (
                      <video
                        src={c.url}
                        className="h-full w-full object-cover"
                        muted
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={c.thumbnailUrl || c.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="space-y-1 p-3">
                    <p className="line-clamp-2 text-xs text-white/50">
                      {c.prompt || "Sem prompt"}
                    </p>
                    <p className="text-[11px] text-white/30">
                      {c.mediaType === "video" ? "Vídeo" : "Imagem"} · expira{" "}
                      {new Date(c.expiresAt).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderBtn({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors",
        active
          ? "bg-sky-500/15 text-sky-100"
          : "text-white/55 hover:bg-white/[0.04] hover:text-white/80"
      )}
    >
      <span className={active ? "text-sky-300" : "text-white/35"}>{icon}</span>
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="text-xs text-white/35">{count}</span>
    </button>
  );
}
