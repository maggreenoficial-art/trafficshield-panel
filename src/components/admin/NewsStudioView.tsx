"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  Download,
  ExternalLink,
  ImagePlus,
  Loader2,
  Newspaper,
  Upload,
  Video,
} from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { panelCard, panelCardPadded, panelInput } from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import { downloadBlob } from "@/lib/media/strip-image-client";
import type { NewsBrand, NewsDraft, NewsItem } from "@/lib/news/types";

function formatDate(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function isPlayerUrl(url: string) {
  return /youtube|youtu\.be|vimeo|facebook|fb\.watch|tiktok|instagram/i.test(url);
}

function NewsBadge({ item }: { item: NewsItem }) {
  const label =
    item.kind === "instagram"
      ? "Instagram"
      : item.kind === "youtube"
        ? "YouTube"
        : item.videoUrl
          ? "Vídeo"
          : item.imageUrl
            ? "Foto"
            : "Texto";
  return (
    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
      {label}
    </span>
  );
}

async function downloadNewsMedia(
  url: string,
  kind: "image" | "video",
  news: NewsItem
) {
  const res = await fetch(
    `/api/admin/news/media?kind=${kind}&title=${encodeURIComponent(news.title)}&url=${encodeURIComponent(url)}&page=${encodeURIComponent(news.url)}`
  );
  if (res.status === 409) {
    const data = (await res.json()) as { openUrl?: string; error?: string };
    if (data.openUrl) {
      window.open(data.openUrl, "_blank", "noopener,noreferrer");
      return;
    }
    throw new Error(data.error || "Abra o link original para ver esta mídia.");
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(data.error || "Não baixou a mídia.");
  }
  const blob = await res.blob();
  const match = res.headers
    .get("content-disposition")
    ?.match(/filename="([^"]+)"/);
  downloadBlob(blob, match?.[1] || `noticia-${kind}`);
}

export function NewsStudioView() {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [brand, setBrand] = useState<NewsBrand>({ logoUrl: null, mockupUrl: null });
  const [draft, setDraft] = useState<NewsDraft | null>(null);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [storyboardId, setStoryboardId] = useState("");
  const [filter, setFilter] = useState<"all" | "video">("all");
  const [pasteUrl, setPasteUrl] = useState("");
  const logoRef = useRef<HTMLInputElement | null>(null);
  const mockupRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void Promise.all([
      fetch("/api/admin/news/brand")
        .then((res) => res.json())
        .then((data) => {
          if (data.brand) setBrand(data.brand);
        }),
      loadNews(),
    ]).catch((e: Error) => setError(e.message));
  }, []);

  async function loadNews() {
    setBusy("news");
    setError("");
    try {
      const res = await fetch("/api/admin/news");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha ao buscar notícias.");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao buscar notícias.");
    } finally {
      setBusy("");
    }
  }

  async function importSocial() {
    const url = pasteUrl.trim();
    if (!url) return;
    setBusy("paste");
    setError("");
    try {
      const res = await fetch("/api/admin/news/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não leu esse link.");
      const item = data.item as NewsItem;
      setItems((current) => [item, ...current.filter((row) => row.id !== item.id)]);
      setPasteUrl("");
      setFilter("video");
      setNotice(
        item.kind === "instagram"
          ? "Reel do Instagram na lista. Dá para abrir; o Instagram não solta o arquivo para baixar."
          : "Vídeo do YouTube na lista."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler o link.");
    } finally {
      setBusy("");
    }
  }

  async function saveBrand(next: NewsBrand) {
    const res = await fetch("/api/admin/news/brand", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não salvou a marca.");
    setBrand(data.brand);
  }

  async function uploadAsset(kind: "logo" | "mockup", file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Envie uma imagem JPEG, PNG ou WEBP.");
      return;
    }
    setBusy(kind);
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const up = await fetch("/api/admin/storyboards/upload", { method: "POST", body });
      const data = await up.json();
      if (!up.ok) throw new Error(data.error || "Não enviou a imagem.");
      await saveBrand({
        ...brand,
        [kind === "logo" ? "logoUrl" : "mockupUrl"]: data.url,
      });
      setNotice(
        kind === "logo"
          ? "Logo salva. Vale para as próximas notícias."
          : "Mockup salvo. A notícia entra nesse quadro."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no envio.");
    } finally {
      setBusy("");
    }
  }

  async function produce(news: NewsItem) {
    setBusy(`produce:${news.id}`);
    setError("");
    setNotice("");
    setStoryboardId("");
    try {
      const res = await fetch("/api/admin/news/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ news }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "A IA não produziu o texto.");
      setDraft(data.draft);
      setNotice("Texto pronto. Confira e autorize para jogar no storyboard.");
      requestAnimationFrame(() => {
        document.getElementById("news-production")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na produção.");
    } finally {
      setBusy("");
    }
  }

  async function authorize() {
    if (!draft) return;
    if (!brand.logoUrl || !brand.mockupUrl) {
      setError("Envie a logo e o mockup da página antes de autorizar.");
      return;
    }
    if (
      !confirm(
        "Autorizar esta notícia? Vamos criar um storyboard novo e gerar a imagem no mockup."
      )
    ) {
      return;
    }
    setBusy("board");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/news/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não criou o storyboard.");
      setStoryboardId(data.storyboardId);
      const gen = await fetch(`/api/admin/storyboards/${data.storyboardId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blockId: data.block.id,
          modelKey: "image",
          prompt: data.block.prompt,
          aspectRatio: "9:16",
          resolution: "1K",
          referenceUrls: data.block.referenceUrls ?? [],
        }),
      });
      const genData = await gen.json();
      if (!gen.ok) {
        throw new Error(
          genData.error ||
            "O storyboard foi criado, mas a imagem ainda não gerou. Abra e clique em gerar."
        );
      }
      setNotice(
        `Storyboard criado${data.name ? `: ${data.name}` : ""}. A imagem da notícia no mockup já foi pedida à Kie.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao autorizar.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6 pb-24 sm:space-y-8 lg:pb-0">
      <AdminPageTitle
        title="Notícias"
        subtitle="Puxa Cassilândia MS, inclui vídeo do YouTube e do Instagram quando acha, escreve a legenda e, se você autorizar, joga a arte no storyboard."
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
          {notice}
        </p>
      )}

      <section className={cn(panelCardPadded, "space-y-4")}>
        <div>
          <h2 className="text-sm font-medium text-white">Logo e mockup</h2>
          <p className="mt-1 text-xs leading-relaxed text-white/45">
            Envie uma vez. A logo entra no lugar dela. O mockup é a foto da
            página (celular ou arte) com o espaço onde a notícia aparece.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <AssetSlot
            label="Logo"
            url={brand.logoUrl}
            busy={busy === "logo"}
            inputRef={logoRef}
            onPick={(file) => void uploadAsset("logo", file)}
          />
          <AssetSlot
            label="Mockup da página"
            url={brand.mockupUrl}
            busy={busy === "mockup"}
            inputRef={mockupRef}
            onPick={(file) => void uploadAsset("mockup", file)}
          />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-white">Cassilândia MS</h2>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void loadNews()}
              className="rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 disabled:opacity-40"
            >
              {busy === "news" ? "Buscando..." : "Atualizar"}
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px]",
                filter === "all" ? "bg-white/15 text-white" : "bg-white/5 text-white/50"
              )}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setFilter("video")}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px]",
                filter === "video" ? "bg-white/15 text-white" : "bg-white/5 text-white/50"
              )}
            >
              Com vídeo
            </button>
          </div>
          <div className="flex gap-2">
            <input
              className={cn(panelInput, "text-xs")}
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="Cole um Reel do Instagram ou um YouTube"
              onKeyDown={(e) => {
                if (e.key === "Enter") void importSocial();
              }}
            />
            <button
              type="button"
              disabled={Boolean(busy) || !pasteUrl.trim()}
              onClick={() => void importSocial()}
              className="shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/70 disabled:opacity-40"
            >
              {busy === "paste" ? "Lendo..." : "Trazer"}
            </button>
          </div>
          <ul className="space-y-2">
            {items
              .filter((item) => filter === "all" || Boolean(item.videoUrl))
              .map((item) => {
              const active = draft?.news.id === item.id;
              const producing = busy === `produce:${item.id}`;
              return (
                <li
                  key={item.id}
                  className={cn(panelCard, "p-4", active && "ring-1 ring-violet-400/50")}
                >
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    <NewsBadge item={item} />
                  </div>
                  <p className="text-sm font-medium text-white/85">{item.title}</p>
                  <p className="mt-1 text-[11px] text-white/40">
                    {item.source}
                    {formatDate(item.publishedAt)
                      ? ` · ${formatDate(item.publishedAt)}`
                      : ""}
                  </p>
                  {item.summary && (
                    <p className="mt-2 line-clamp-2 text-xs text-white/45">
                      {item.summary}
                    </p>
                  )}
                  {item.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.imageUrl}
                      alt=""
                      className="mt-3 h-24 w-full rounded-lg object-cover"
                    />
                  )}
                  <NewsLinks
                    news={item}
                    disabled={Boolean(busy)}
                    producing={producing}
                    onProduce={() => void produce(item)}
                    onError={setError}
                  />
                </li>
              );
            })}
            {!items.filter((item) => filter === "all" || Boolean(item.videoUrl)).length &&
              busy !== "news" && (
              <p className="text-sm text-white/40">
                {filter === "video"
                  ? "Nenhum vídeo nesta busca. Cole um Reel ou um YouTube acima."
                  : "Nenhuma notícia na lista."}
              </p>
            )}
          </ul>
        </div>

        <div id="news-production" className={cn(panelCardPadded, "space-y-4")}>
          <h2 className="text-sm font-medium text-white">Produção</h2>
          {!draft ? (
            <p className="text-sm text-white/40">
              Escolha uma notícia. A IA escreve a manchete e a legenda. Nada vai
              para o storyboard sem a sua autorização.
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1 block text-[11px] text-white/40">Manchete</label>
                <input
                  className={panelInput}
                  value={draft.headline}
                  onChange={(e) =>
                    setDraft({ ...draft, headline: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-white/40">
                  Texto do Instagram
                </label>
                <textarea
                  className={cn(panelInput, "min-h-44")}
                  value={draft.caption}
                  onChange={(e) =>
                    setDraft({ ...draft, caption: e.target.value })
                  }
                />
              </div>
              {draft.news.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.news.imageUrl}
                  alt=""
                  className="h-28 w-full rounded-lg object-cover"
                />
              )}
              <NewsLinks
                news={draft.news}
                disabled={Boolean(busy)}
                producing={false}
                onError={setError}
              />
              <p className="text-[11px] text-white/35">
                Fonte: {draft.news.source}. A imagem gerada usa o mockup e a logo
                enviados acima.
              </p>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void authorize()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
              >
                {busy === "board" ? <Loader2 className="animate-spin" size={16} /> : null}
                Autorizar e jogar no storyboard
              </button>
            </>
          )}
          {storyboardId && (
            <a
              href={`/storyboards/${storyboardId}`}
              className="inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-black"
            >
              Abrir storyboard
            </a>
          )}
        </div>
      </section>
    </div>
  );
}

function NewsLinks({
  news,
  disabled,
  producing,
  onProduce,
  onError,
}: {
  news: NewsItem;
  disabled: boolean;
  producing: boolean;
  onProduce?: () => void;
  onError: (message: string) => void;
}) {
  const [saving, setSaving] = useState<"image" | "video" | "">("");

  async function save(kind: "image" | "video", url: string) {
    setSaving(kind);
    try {
      await downloadNewsMedia(url, kind, news);
    } catch (e) {
      onError(e instanceof Error ? e.message : "Falha no download.");
    } finally {
      setSaving("");
    }
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <a
        href={news.url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:text-white"
      >
        <ExternalLink size={12} />
        {news.kind === "instagram"
          ? "Ver no Instagram"
          : news.kind === "youtube"
            ? "Ver no YouTube"
            : "Ver original"}
      </a>
      {news.imageUrl && (
        <button
          type="button"
          disabled={disabled || Boolean(saving)}
          onClick={() => void save("image", news.imageUrl!)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:text-white disabled:opacity-40"
        >
          {saving === "image" ? (
            <Loader2 className="animate-spin" size={12} />
          ) : (
            <Download size={12} />
          )}
          Baixar imagem
        </button>
      )}
      {news.videoUrl &&
        isPlayerUrl(news.videoUrl) &&
        news.videoUrl.replace(/\/+$/, "") !== news.url.replace(/\/+$/, "") && (
        <a
          href={news.videoUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:text-white"
        >
          <Video size={12} />
          Ver vídeo
        </a>
      )}
      {news.videoUrl && !isPlayerUrl(news.videoUrl) && (
        <button
          type="button"
          disabled={disabled || Boolean(saving)}
          onClick={() => void save("video", news.videoUrl!)}
          className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:text-white disabled:opacity-40"
        >
          {saving === "video" ? (
            <Loader2 className="animate-spin" size={12} />
          ) : (
            <Download size={12} />
          )}
          Baixar vídeo
        </button>
      )}
      {onProduce && (
        <button
          type="button"
          disabled={disabled}
          onClick={onProduce}
          className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/20 px-3 py-1.5 text-[11px] text-violet-200 disabled:opacity-40"
        >
          {producing ? (
            <Loader2 className="animate-spin" size={12} />
          ) : (
            <Newspaper size={12} />
          )}
          Produzir para o Instagram
        </button>
      )}
    </div>
  );
}

function AssetSlot({
  label,
  url,
  busy,
  inputRef,
  onPick,
}: {
  label: string;
  url: string | null;
  busy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onPick: (file: File | undefined) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-white/45">{label}</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          onPick(file);
        }}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="flex min-h-36 w-full flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/15 bg-white/[0.02] text-white/50 disabled:opacity-40"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-36 w-full object-contain" />
        ) : busy ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <>
            {label === "Logo" ? <ImagePlus size={18} /> : <Upload size={18} />}
            <span className="mt-2 text-xs">Enviar {label.toLowerCase()}</span>
          </>
        )}
      </button>
    </div>
  );
}
