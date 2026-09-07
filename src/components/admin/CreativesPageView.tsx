"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Clock,
  FileText,
  Folder,
  FolderOpen,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import {
  panelCard,
  panelPillBtn,
  panelSearch,
} from "@/lib/panel-styles";
import { cn } from "@/lib/utils";

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

export function CreativesPageView() {
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [counts, setCounts] = useState({ all: 0, unfiled: 0 });
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [folder, setFolder] = useState<string>("all");
  const [type, setType] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const filtered = creatives.filter((c) => {
    if (!query.trim()) return true;
    return (c.prompt || "").toLowerCase().includes(query.toLowerCase());
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Meus Criativos"
        subtitle="Crie, organize e gerencie seus criativos."
      />

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
            Arquivos expiram após 7 dias
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

          {error && (
            <p className="text-sm text-red-300">{error}</p>
          )}

          {loading ? (
            <p className="text-sm text-white/40">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div
              className={cn(
                panelCard,
                "flex items-center justify-center px-6 py-20 text-sm text-white/40"
              )}
            >
              Nenhum criativo nesta pasta.
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
