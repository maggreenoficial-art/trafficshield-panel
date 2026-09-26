"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { CopyNameButton } from "@/components/admin/CopyNameButton";
import { panelCard, panelCardPadded, panelInput } from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import type { DevDoc, DevReferenceKind, ProductDevelopment } from "@/lib/product-dev/types";

type DomainOption = { id: string; hostname: string; label: string | null };
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
  const [domains, setDomains] = useState<DomainOption[]>([]);
  const [current, setCurrent] = useState<ProductDevelopment | null>(null);
  const [name, setName] = useState("");
  const [brief, setBrief] = useState("");
  const [refUrl, setRefUrl] = useState("");
  const [hostname, setHostname] = useState("");
  const [path, setPath] = useState("/");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [brain, setBrain] = useState<DevDoc[]>([]);
  const fileRefs = useRef<Partial<Record<1 | 2 | 3, HTMLInputElement | null>>>({});
  const refFileRef = useRef<HTMLInputElement | null>(null);

  async function reloadList() {
    const res = await fetch("/api/admin/developments");
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Falha ao listar.");
    setItems(data.developments ?? []);
    setDomains(data.domains ?? []);
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
      setHostname(dev.publishHostname ?? data.domains?.[0]?.hostname ?? "");
      setPath(dev.publishPath || "/");
      setDomains(data.domains ?? []);
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

  async function addReference() {
    if (!current || !refUrl.trim()) return;
    setError("");
    const referencePages = [
      ...current.referencePages,
      { kind: "site" as const, url: refUrl.trim(), title: refUrl.trim(), text: "" },
    ].slice(0, 8);
    setRefUrl("");
    try {
      await saveDraft({ ...current, name, brief, referencePages });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao guardar a página.");
    }
  }

  async function onReferenceFile(list: FileList | null) {
    const file = list?.[0];
    if (refFileRef.current) refFileRef.current.value = "";
    if (!file || !current) return;
    setError("");
    setBusy("ref");
    try {
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      let referencePages: ProductDevelopment["referencePages"] = current.referencePages;
      if (isImage || isVideo) {
        const body = new FormData();
        body.set("file", file);
        const res = await fetch("/api/admin/storyboards/upload", {
          method: "POST",
          body,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Não enviou o arquivo.");
        const kind: DevReferenceKind = isVideo ? "video" : "image";
        const item = {
          kind,
          url: data.url as string,
          title: file.name,
          text: "",
        };
        referencePages = [...referencePages, item].slice(0, 8);
      } else {
        const text = await readDoc(file);
        const item = { kind: "text" as const, url: "", title: file.name, text };
        referencePages = [...referencePages, item].slice(0, 8);
      }
      await saveDraft({ ...current, name, brief, referencePages });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na referência.");
    } finally {
      setBusy("");
    }
  }

  async function processProduct() {
    if (!current) return;
    setBusy("grok");
    setError("");
    setNotice("");
    try {
      await saveDraft({ ...current, name, brief });
      const res = await fetch("/api/admin/developments/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id }),
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
      setNotice("Grok 4.6 montou a copy, a página e os criativos.");
      await reloadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no Grok.");
    } finally {
      setBusy("");
    }
  }

  async function sendStoryboard(generateImages: boolean) {
    if (!current) return;
    setBusy(generateImages ? "gerar" : "board");
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/developments/storyboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: current.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Storyboard falhou.");
      setCurrent({ ...current, storyboardId: data.storyboardId });
      if (generateImages && !data.already) {
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
                modelKey: block.modelKey,
                prompt: block.prompt,
                aspectRatio: "1:1",
                resolution: "1K",
              }),
            }
          );
          const genData = await gen.json();
          if (!gen.ok) throw new Error(genData.error || "A Kie não gerou a imagem.");
        }
      }
      const videos = (data.blocks ?? []).filter(
        (block: { kind: string }) => block.kind === "video"
      ).length;
      setNotice(
        generateImages
          ? `Imagens autorizadas na Kie. ${videos} takes de vídeo ficaram em rascunho no storyboard, ligados à imagem.`
          : "Storyboard criado com imagens e takes em rascunho. Nada foi gerado ainda."
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no storyboard.");
    } finally {
      setBusy("");
    }
  }

  async function publish() {
    if (!current) return;
    if (!hostname) {
      setError("Escolha um domínio já cadastrado.");
      return;
    }
    setBusy("publicar");
    setError("");
    try {
      const res = await fetch("/api/admin/developments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: current.id,
          publishHostname: hostname,
          publishPath: path || "/",
          publish: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não publicou.");
      setCurrent(data.development);
      setNotice(`No ar em https://${hostname}${path || "/"}`);
      await reloadList();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao publicar.");
    } finally {
      setBusy("");
    }
  }

  const plan = current?.plan;

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Desenvolvimento"
        subtitle="O cérebro define como o Grok pensa. Imagem, vídeo, texto e site são a referência de cada produto."
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
            placeholder="Briefing curto (opcional)"
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
          <section className={cn(panelCardPadded, "space-y-3")}>
            <h2 className="text-sm font-medium text-white/80">
              Referências deste produto
            </h2>
            <p className="text-xs text-white/40">
              Imagem, vídeo, texto ou site. O Grok olha isso com o pensamento do
              cérebro, não no lugar dele.
            </p>
            <input
              ref={refFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/webm,video/quicktime,.pdf,.txt,.md,text/plain"
              className="hidden"
              onChange={(e) => void onReferenceFile(e.target.files)}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => refFileRef.current?.click()}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white"
              >
                {busy === "ref" ? "Enviando…" : "Imagem, vídeo ou texto"}
              </button>
              <input
                className={panelInput}
                placeholder="https:// página de referência"
                value={refUrl}
                onChange={(e) => setRefUrl(e.target.value)}
              />
              <button
                type="button"
                onClick={() => void addReference()}
                disabled={current.referencePages.length >= 8}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white disabled:opacity-40"
              >
                Site
              </button>
            </div>
            <ul className="space-y-1 text-xs text-white/50">
              {current.referencePages.map((page, index) => (
                <li key={`${page.kind}-${page.title}-${index}`} className="truncate">
                  {(page.kind ?? "site").toUpperCase()} · {page.title || page.url}
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void processProduct()}
              className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
            >
              {busy === "grok" ? <Loader2 className="animate-spin" size={16} /> : null}
              Processar com Grok 4.6
            </button>
          </section>

          {plan && (
            <>
              <section className={cn(panelCardPadded, "space-y-3")}>
                <h2 className="text-sm font-medium text-white/80">Copy do produto</h2>
                <p className="text-sm leading-relaxed text-white/60">{plan.summary}</p>
                <CopyRow label="Headline" text={plan.copy.headline} />
                <CopyRow label="Subheadline" text={plan.copy.subheadline} />
                {plan.copy.sections.map((section) => (
                  <CopyRow
                    key={section.title}
                    label={section.title}
                    text={section.body}
                  />
                ))}
                <CopyRow label="CTA" text={plan.copy.cta} />
                <CopyRow label="Assunto do e-mail" text={plan.copy.emailSubject} />
                <CopyRow label="E-mail" text={plan.copy.emailBody} />
              </section>

              {plan.pageHtml && (
                <section className="space-y-3">
                  <h2 className="text-sm font-medium text-white/80">
                    Página do produto
                  </h2>
                  <iframe
                    title="Prévia da página"
                    sandbox=""
                    srcDoc={plan.pageHtml}
                    className="h-[640px] w-full rounded-xl border border-white/10 bg-white"
                  />
                  <div className={cn(panelCardPadded, "flex flex-col gap-3 sm:flex-row sm:items-end")}>
                    <label className="flex-1 text-xs text-white/45">
                      Domínio
                      <select
                        className={cn(panelInput, "mt-1")}
                        value={hostname}
                        onChange={(e) => setHostname(e.target.value)}
                      >
                        <option value="">Escolher</option>
                        {domains.map((domain) => (
                          <option key={domain.id} value={domain.hostname}>
                            {domain.hostname}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="w-full text-xs text-white/45 sm:w-40">
                      Caminho
                      <input
                        className={cn(panelInput, "mt-1")}
                        value={path}
                        onChange={(e) => setPath(e.target.value)}
                      />
                    </label>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() => void publish()}
                      className="rounded-xl bg-emerald-400 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
                    >
                      {busy === "publicar" ? "Publicando…" : "Publicar no domínio"}
                    </button>
                  </div>
                </section>
              )}

              <section className="space-y-3">
                <h2 className="text-sm font-medium text-white/80">
                  Criativos para o storyboard
                </h2>
                <div className="grid gap-3 lg:grid-cols-2">
                  {plan.creatives.map((creative) => (
                    <div key={`${creative.kind}-${creative.title}`} className={panelCardPadded}>
                      <p className="text-[11px] uppercase tracking-wide text-sky-300/80">
                        {creative.kind === "video" ? "Vídeo" : "Imagem"}
                      </p>
                      <p className="mt-1 text-sm text-white">{creative.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-white/50">
                        {creative.prompt}
                      </p>
                      {creative.takes.length > 0 && (
                        <ul className="mt-2 space-y-1 text-xs text-white/45">
                          {creative.takes.map((take) => (
                            <li key={take.title}>
                              {take.title} · {take.seconds}s
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(busy) || Boolean(current.storyboardId)}
                    onClick={() => void sendStoryboard(false)}
                    className="rounded-xl bg-white/10 px-4 py-2.5 text-sm text-white disabled:opacity-40"
                  >
                    {busy === "board" ? "Montando…" : "Montar storyboard"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy) || Boolean(current.storyboardId)}
                    onClick={() => void sendStoryboard(true)}
                    className="rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
                  >
                    {busy === "gerar"
                      ? "Autorizando imagens…"
                      : "Autorizar criação de imagens"}
                  </button>
                  {current.storyboardId && (
                    <a
                      href={`/storyboards/${current.storyboardId}`}
                      className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-medium text-black"
                    >
                      Abrir storyboard
                    </a>
                  )}
                </div>
                <p className="text-xs text-white/40">
                  Autorizar gasta crédito Kie só nas imagens. Os takes de vídeo
                  entram como rascunho, ligados à imagem, para você gerar no
                  storyboard quando a cena estiver pronta.
                </p>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

function CopyRow({ label, text }: { label: string; text: string }) {
  if (!text) return null;
  return (
    <div className="rounded-lg border border-white/[0.06] px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-wide text-white/35">{label}</p>
        <CopyNameButton name={text} />
      </div>
      <p className="mt-1 whitespace-pre-wrap text-sm text-white/75">{text}</p>
    </div>
  );
}
