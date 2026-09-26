"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Upload } from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { panelCard, panelCardPadded, panelInput } from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import type { DevDoc, DevScene, ProductDevelopment } from "@/lib/product-dev/types";

type Listed = { id: string; name: string; status: string; updatedAt: string };

const DOC_SLOTS = [1, 2, 3] as const;

function isPdf(file: File) {
  return (
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
  );
}

async function readDoc(file: File) {
  if (isPdf(file)) {
    if (file.size > 12_000_000) {
      throw new Error(`${file.name} passa de 12 MB.`);
    }
    const body = new FormData();
    body.set("file", file);
    const res = await fetch("/api/admin/developments/extract", {
      method: "POST",
      body,
    });
    const data = (await res.json()) as { error?: string; text?: string };
    if (!res.ok || !data.text) {
      throw new Error(data.error || "Não consegui ler o PDF.");
    }
    return data.text;
  }
  if (file.size > 1_500_000) {
    throw new Error(`${file.name} passa de 1,5 MB.`);
  }
  return (await file.text()).replace(/\u0000/g, "").slice(0, 40_000);
}

export function DevelopmentView() {
  const [items, setItems] = useState<Listed[]>([]);
  const [current, setCurrent] = useState<ProductDevelopment | null>(null);
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [chatText, setChatText] = useState("");
  const [chatFiles, setChatFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [brain, setBrain] = useState<DevDoc[]>([]);
  const fileRefs = useRef<Partial<Record<1 | 2 | 3, HTMLInputElement | null>>>({});
  const productFileRef = useRef<HTMLInputElement | null>(null);
  const chatFileRef = useRef<HTMLInputElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  async function reloadList() {
    const res = await fetch("/api/admin/developments");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao listar.");
    setItems(data.developments ?? []);
  }

  useEffect(() => {
    void reloadList().catch((e: Error) => setError(e.message));
    void fetch("/api/admin/developments/brain")
      .then((res) => res.json())
      .then((data) => setBrain(data.docs ?? []))
      .catch(() => undefined);
  }, []);

  async function openItem(id: string) {
    setBusy("abrir");
    setError("");
    try {
      const res = await fetch(`/api/admin/developments?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não encontrado.");
      const dev = data.development as ProductDevelopment;
      setCurrent(dev);
      setName(dev.name);
      setBrief(dev.brief);
      setChatText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao abrir.");
    } finally {
      setBusy("");
    }
  }

  async function createProduct() {
    if (!name.trim()) {
      setError("Dê um nome ao produto.");
      return;
    }
    setBusy("criar");
    setError("");
    try {
      const res = await fetch("/api/admin/developments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, brief }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não criou.");
      setCurrent(data.development);
      await reloadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao criar.");
    } finally {
      setBusy("");
    }
  }

  async function saveDraft(next: ProductDevelopment) {
    const res = await fetch("/api/admin/developments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: next.id,
        name: next.name,
        brief: next.brief,
        docs: next.docs,
        referencePages: next.referencePages,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não salvou.");
    setCurrent(data.development);
    return data.development as ProductDevelopment;
  }

  async function onBrainDoc(slot: 1 | 2 | 3, list: FileList | null) {
    const file = list?.[0];
    const input = fileRefs.current[slot];
    if (input) input.value = "";
    if (!file) return;
    setError("");
    setBusy("doc");
    try {
      const text = await readDoc(file);
      const docs = [
        ...brain.filter((doc) => doc.slot !== slot),
        { slot, name: file.name, text },
      ];
      const res = await fetch("/api/admin/developments/brain", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ docs }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não salvou o cérebro.");
      setBrain(data.docs ?? docs);
      setNotice("Cérebro salvo. Vale para todo produto daqui pra frente.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no documento.");
    } finally {
      setBusy("");
    }
  }

  async function onProductImage(list: FileList | null) {
    const files = list ? [...list] : [];
    if (productFileRef.current) productFileRef.current.value = "";
    if (!files.length || !current) return;
    setBusy("ref");
    setError("");
    try {
      let referencePages = current.referencePages.filter((item) => item.kind === "image");
      for (const file of files.slice(0, 8)) {
        if (!file.type.startsWith("image/")) {
          throw new Error("Envie imagem (JPG, PNG ou WEBP).");
        }
        const body = new FormData();
        body.set("file", file);
        const res = await fetch("/api/admin/storyboards/upload", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Não enviou a imagem.");
        referencePages = [
          ...referencePages,
          {
            kind: "image" as const,
            url: data.url as string,
            title: file.name,
            text: file.name,
          },
        ].slice(0, 8);
      }
      await saveDraft({ ...current, name, brief, referencePages });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na referência.");
    } finally {
      setBusy("");
    }
  }

  async function removeProductImage(url: string) {
    if (!current) return;
    const referencePages = current.referencePages.filter((item) => item.url !== url);
    try {
      await saveDraft({ ...current, name, brief, referencePages });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não removeu.");
    }
  }

  async function sendChat(preset?: string) {
    const message = (preset ?? chatText).trim();
    if (!current || (!message && !chatFiles.length)) return;
    const files = chatFiles.slice(0, 4);
    if (!preset) setChatText("");
    setChatFiles([]);
    setBusy("grok");
    setError("");
    setNotice("");
    try {
      await saveDraft({ ...current, name, brief });
      const images: string[] = [];
      for (const file of files) {
        const body = new FormData();
        body.set("file", file);
        const up = await fetch("/api/admin/storyboards/upload", { method: "POST", body });
        const uploaded = await up.json();
        if (!up.ok) throw new Error(uploaded.error || "Não enviou a imagem.");
        images.push(uploaded.url as string);
      }
      const res = await fetch("/api/admin/developments/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, message, images }),
      });
      const raw = await res.text();
      let data: { error?: string; development?: ProductDevelopment } = {};
      try {
        data = raw ? (JSON.parse(raw) as typeof data) : {};
      } catch {
        throw new Error(raw.replace(/\s+/g, " ").trim().slice(0, 220) || "Grok falhou.");
      }
      if (!res.ok) throw new Error(data.error || "Grok falhou.");
      setCurrent(data.development ?? null);
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch (e) {
      if (!preset) setChatText(message);
      setChatFiles(files);
      setError(e instanceof Error ? e.message : "Falha no Grok.");
    } finally {
      setBusy("");
    }
  }

  async function sendScenes(scenes: DevScene[], generateImages: boolean) {
    if (!current) return;
    setBusy(generateImages ? "gerar" : "board");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/developments/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id, storyboard: { scenes } }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Storyboard falhou.");
      setCurrent({ ...current, storyboardId: data.storyboardId });
      if (generateImages) {
        const images = (data.blocks ?? []).filter(
          (block: { kind: string }) => block.kind === "image"
        );
        for (const block of images) {
          const gen = await fetch(
            `/api/admin/storyboards/${data.storyboardId}/generate`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                blockId: block.id,
                modelKey: "image",
                prompt: block.prompt,
                aspectRatio: "9:16",
                resolution: "1K",
              }),
            }
          );
          const genData = await gen.json();
          if (!gen.ok) throw new Error(genData.error || "A Kie não gerou a cena.");
        }
      }
      setNotice(
        generateImages
          ? "Cenas foram para a Kie. Os takes estão plugados nelas, em rascunho, no storyboard."
          : "Cenas e takes entraram no storyboard, em rascunho."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no storyboard.");
    } finally {
      setBusy("");
    }
  }

  const messages = current?.plan?.messages ?? [];

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Desenvolvimento"
        subtitle="O cérebro e as referências do produto alimentam os takes. Cada take é o roteiro de um vídeo de 8s."
      />

      <section className={cn(panelCard, "space-y-4 p-5")}>
        <div className="grid gap-3 md:grid-cols-[1.2fr_1.4fr_auto]">
          <input
            className={panelInput}
            placeholder="Nome do produto"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className={panelInput}
            placeholder="O que o vídeo precisa vender (opcional)"
            value={brief}
            onChange={(e) => setBrief(e.target.value)}
          />
          <button
            type="button"
            onClick={() => void createProduct()}
            disabled={Boolean(busy)}
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
          >
            Novo produto
          </button>
        </div>
        {items.length > 0 && (
          <ul className="space-y-1">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => void openItem(item.id)}
                  className="w-full truncate rounded-lg px-3 py-2 text-left text-xs text-white/55 hover:bg-white/[0.04] hover:text-white/80"
                >
                  {item.name} · {item.status}
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
        {notice && <p className="text-sm text-emerald-300/90">{notice}</p>}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-white/80">Cérebro</h2>
        <p className="text-xs text-white/40">
          Documentos fixos de como a IA pensa. Ficam salvos e entram em todo
          produto. PDF, txt ou md.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {DOC_SLOTS.map((slot) => {
            const doc = brain.find((item) => item.slot === slot);
            return (
              <div key={slot}>
                <input
                  ref={(el) => {
                    fileRefs.current[slot] = el;
                  }}
                  type="file"
                  accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain"
                  className="hidden"
                  onChange={(e) => void onBrainDoc(slot, e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileRefs.current[slot]?.click()}
                  className={cn(
                    "flex w-full flex-col items-center gap-2 rounded-xl border border-dashed px-3 py-8 text-center text-sm",
                    doc
                      ? "border-emerald-500/40 bg-emerald-500/8 text-emerald-100"
                      : "border-white/15 text-white/55"
                  )}
                >
                  <Upload size={18} />
                  Cérebro {slot}
                  <span className="max-w-full truncate text-[11px] text-white/40">
                    {doc ? doc.name : "pdf, txt ou md"}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {current && (
        <>
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-white/80">
            Referências do produto
          </h2>
          <p className="text-xs text-white/40">
            Logo, oferta, criativo e página, tudo no mesmo lugar. O Grok junta
            essas imagens com o cérebro para escrever os takes.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              ref={productFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => void onProductImage(e.target.files)}
            />
            <button
              type="button"
              onClick={() => productFileRef.current?.click()}
              className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white"
            >
              {busy === "ref" ? "Enviando…" : "Enviar referências"}
            </button>
          </div>
          {current.referencePages.some((item) => item.kind === "image") && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {current.referencePages
                .filter((item) => item.kind === "image" && item.url)
                .map((item) => (
                  <figure key={item.url} className="space-y-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.url}
                      alt={item.title}
                      className="h-28 w-full rounded-lg object-cover"
                    />
                    <figcaption className="flex items-center justify-between gap-2 text-[11px] text-white/50">
                      <span className="truncate">{item.title}</span>
                      <button
                        type="button"
                        onClick={() => void removeProductImage(item.url)}
                        className="shrink-0 text-white/35 hover:text-red-300"
                      >
                        tirar
                      </button>
                    </figcaption>
                  </figure>
                ))}
            </div>
          )}
        </section>
        <section className={cn(panelCardPadded, "space-y-4")}>
          <div>
            <h2 className="text-sm font-medium text-white/80">Takes do vídeo</h2>
            <p className="mt-1 text-xs text-white/40">
              Este chat escreve o roteiro dos takes. Cada take é um vídeo de 8s,
              plugado na cena parada, pronto para ir ao storyboard.
            </p>
          </div>
          <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {messages.length === 0 && (
              <p className="text-sm text-white/40">
                Envie as referências e gere os takes. O roteiro de cada vídeo aparece aqui.
              </p>
            )}
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-sm leading-relaxed",
                  message.role === "user"
                    ? "bg-sky-500/15 text-white"
                    : "bg-white/[0.04] text-white/75"
                )}
              >
                {message.images && message.images.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-2">
                    {message.images.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={url}
                        src={url}
                        alt=""
                        className="h-20 w-20 rounded-lg object-cover"
                      />
                    ))}
                  </div>
                )}
                {message.text && (
                  <p className="whitespace-pre-wrap">{message.text}</p>
                )}
                {message.scenes && message.scenes.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.scenes.map((scene) => (
                      <div
                        key={scene.title}
                        className="rounded-lg border border-white/10 px-3 py-2"
                      >
                        <p className="text-[11px] uppercase tracking-wide text-sky-300/80">
                          Cena · {scene.title}
                        </p>
                        <p className="mt-1 text-xs text-white/60">{scene.prompt}</p>
                        <ul className="mt-2 space-y-1">
                          {scene.takes.map((take) => (
                            <li key={take.title} className="text-xs text-white/50">
                              {take.title} · {take.seconds}s — {take.prompt}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void sendScenes(message.scenes ?? [], false)}
                        className="rounded-xl bg-white/10 px-3 py-2 text-xs text-white disabled:opacity-40"
                      >
                        {busy === "board" ? "Enviando…" : "Jogar no storyboard"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => void sendScenes(message.scenes ?? [], true)}
                        className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-medium text-black disabled:opacity-40"
                      >
                        {busy === "gerar" ? "Gerando cenas…" : "Gerar as cenas na Kie"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          {chatFiles.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chatFiles.map((file, index) => (
                <span
                  key={`${file.name}-${index}`}
                  className="rounded-full bg-white/10 px-2 py-1 text-[11px] text-white/70"
                >
                  {file.name}
                </span>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              void sendChat(
                "Olha as referências deste produto junto com o cérebro e escreve os takes do criativo de vídeo. Cada take é um roteiro de 8 segundos que vira o vídeo."
              )
            }
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
          >
            {busy === "grok" ? <Loader2 className="animate-spin" size={16} /> : null}
            Gerar os takes
          </button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input
              ref={chatFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="hidden"
              onChange={(e) => {
                const picked = e.target.files ? [...e.target.files] : [];
                e.target.value = "";
                setChatFiles((prev) => [...prev, ...picked].slice(0, 4));
              }}
            />
            <button
              type="button"
              title="Enviar imagem"
              onClick={() => chatFileRef.current?.click()}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/70"
            >
              <ImagePlus size={18} />
            </button>
            <textarea
              className={cn(panelInput, "min-h-20 flex-1")}
              placeholder="Ajuste o gancho, a fala ou o que o take precisa mostrar…"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendChat();
                }
              }}
            />
            <button
              type="button"
              disabled={Boolean(busy) || (!chatText.trim() && !chatFiles.length)}
              onClick={() => void sendChat()}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
            >
              {busy === "grok" ? <Loader2 className="animate-spin" size={16} /> : null}
              Enviar
            </button>
          </div>
          {current.storyboardId && (
            <a
              href={`/storyboards/${current.storyboardId}`}
              className="inline-flex rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-black"
            >
              Abrir storyboard
            </a>
          )}
        </section>
        </>
      )}
    </div>
  );
}

