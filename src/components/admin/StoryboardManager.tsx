"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ImageIcon,
  Layers,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import {
  panelCard,
  panelInput,
  panelMenu,
  panelMenuItem,
  panelPillBtn,
  panelSearch,
} from "@/lib/panel-styles";
import { cn } from "@/lib/utils";

type Storyboard = {
  id: string;
  name: string;
  description: string;
  coverUrl: string | null;
  updatedAt: string;
  sceneCount?: number;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function StoryboardManager() {
  const [items, setItems] = useState<Storyboard[]>([]);
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"recent" | "name">("recent");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/storyboards");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar");
      setItems(data.storyboards ?? []);
      setCredits(data.credits ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (q) {
      list = list.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q)
      );
    }
    if (sort === "name") {
      return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    }
    return [...list].sort(
      (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)
    );
  }, [items, query, sort]);

  async function createStoryboard() {
    const name = newName.trim() || "Novo storyboard";
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/storyboards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao criar");
      setNewName("");
      window.location.href = `/storyboards/${data.storyboard.id}`;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar");
      setCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Excluir este storyboard?")) return;
    setMenuId(null);
    const res = await fetch(`/api/admin/storyboards/${id}`, { method: "DELETE" });
    if (res.ok) setItems((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className={cn(panelSearch, "w-full sm:max-w-md")}>
          <Search size={16} className="shrink-0 text-white/35" />
          <input
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            placeholder="Buscar storyboard..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-white/[0.08] px-3 py-1.5 text-xs text-white/50">
            {credits} créditos
          </span>
          <button
            type="button"
            onClick={() => void createStoryboard()}
            disabled={creating}
            className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            <Plus size={16} strokeWidth={2} />
            Novo storyboard
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-white/40">
          {filtered.length} storyboard{filtered.length === 1 ? "" : "s"}
        </p>
        <select
          className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-sm text-white/70 outline-none"
          value={sort}
          onChange={(e) => setSort(e.target.value as "recent" | "name")}
        >
          <option value="recent">Mais recentes</option>
          <option value="name">Nome</option>
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-white/40">Carregando...</p>
      ) : filtered.length === 0 ? (
        <div
          className={cn(
            panelCard,
            "flex flex-col items-center justify-center gap-3 px-6 py-16 text-center"
          )}
        >
          <ImageIcon className="text-white/25" size={36} strokeWidth={1.25} />
          <p className="text-sm text-white/45">
            Nenhum storyboard ainda. Crie o primeiro para gerar imagens e vídeos.
          </p>
          <button
            type="button"
            className={panelPillBtn}
            onClick={() => void createStoryboard()}
          >
            Criar agora
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((s) => (
            <div key={s.id} className={cn(panelCard, "relative overflow-hidden")}>
              <Link href={`/storyboards/${s.id}`} className="block">
                <div className="flex aspect-[16/10] items-center justify-center bg-white/[0.03]">
                  {s.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.coverUrl}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon
                      className="text-white/20"
                      size={40}
                      strokeWidth={1.25}
                    />
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <h3 className="truncate text-base font-medium text-white/90">
                    {s.name}
                  </h3>
                  <p className="line-clamp-2 text-sm text-white/40">
                    {s.description}
                  </p>
                  <div className="flex items-center gap-4 pt-1 text-xs text-white/35">
                    <span className="inline-flex items-center gap-1.5">
                      <Layers size={13} />
                      {s.sceneCount ?? 0} cenas
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={13} />
                      Atualizado {formatDate(s.updatedAt)}
                    </span>
                  </div>
                </div>
              </Link>

              <button
                type="button"
                className="absolute right-2 top-2 rounded-md bg-black/50 p-1.5 text-white/60 backdrop-blur hover:text-white"
                onClick={() => setMenuId(menuId === s.id ? null : s.id)}
              >
                <MoreHorizontal size={16} />
              </button>
              {menuId === s.id && (
                <div className={cn(panelMenu, "right-2 top-10")}>
                  <button
                    type="button"
                    className={cn(panelMenuItem, "text-red-400/90")}
                    onClick={() => void remove(s.id)}
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="hidden">
        <input
          className={panelInput}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nome"
        />
      </div>
    </div>
  );
}
