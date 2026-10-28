"use client";

import { useEffect, useRef, useState } from "react";
import { Landmark, Loader2, Upload, X } from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { panelCardPadded, panelInput } from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import { POLITICA_MAX_FILES, type PoliticaDoc } from "@/lib/politica/types";
import type { PoliticaEvent, PoliticaMessage } from "@/lib/politica/roundtable";
import { POLITICA_SPEAKERS, type PoliticaSpeakerId } from "@/lib/politica/speakers";

const TONE: Record<PoliticaSpeakerId, string> = {
  gemini: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  anthropic: "border-amber-400/30 bg-amber-500/10 text-amber-100",
  gpt: "border-violet-400/30 bg-violet-500/10 text-violet-100",
};

function speakerMeta(id: PoliticaSpeakerId) {
  return POLITICA_SPEAKERS.find((speaker) => speaker.id === id);
}

export function PoliticaView() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const [docs, setDocs] = useState<PoliticaDoc[]>([]);
  const [brief, setBrief] = useState("");
  const [busy, setBusy] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [messages, setMessages] = useState<PoliticaMessage[]>([]);
  const [consensus, setConsensus] = useState("");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status, consensus]);

  async function onFile(files: FileList | null) {
    const incoming = Array.from(files ?? []).slice(0, POLITICA_MAX_FILES);
    if (!incoming.length) return;
    const room = POLITICA_MAX_FILES - docs.length;
    if (room <= 0) {
      setError(`A mesa aceita no máximo ${POLITICA_MAX_FILES} documentos.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setBusy("doc");
    setError("");
    try {
      const form = new FormData();
      for (const file of incoming.slice(0, room)) form.append("file", file);
      const res = await fetch("/api/admin/politica/documento", {
        method: "POST",
        body: form,
      });
      const data = (await res.json()) as { error?: string; documents?: PoliticaDoc[] };
      if (!res.ok) throw new Error(data.error || "Não leu os documentos.");
      const next = data.documents ?? [];
      if (!next.length) throw new Error("Nenhum documento veio com texto.");
      setDocs((prev) => {
        const names = new Set(prev.map((doc) => doc.name));
        const extra = next.filter((doc) => !names.has(doc.name));
        return [...prev, ...extra].slice(0, POLITICA_MAX_FILES);
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler os arquivos.");
    } finally {
      setBusy("");
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function openTable() {
    if (!docs.length) {
      setError("Envie ao menos um documento antes de abrir a mesa.");
      return;
    }
    setBusy("mesa");
    setError("");
    setStatus(
      docs.length > 1
        ? `A mesa está lendo ${docs.length} documentos…`
        : "A mesa está lendo o documento…"
    );
    setMessages([]);
    setConsensus("");
    try {
      const res = await fetch("/api/admin/politica/mesa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documents: docs, brief }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || "A mesa não abriu.");
      }
      if (!res.body) throw new Error("A mesa não devolveu o chat.");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as PoliticaEvent;
          if (event.type === "status") setStatus(event.text);
          if (event.type === "message") {
            setMessages((prev) => [...prev, event.message]);
          }
          if (event.type === "consensus") {
            setConsensus(event.text);
            setStatus("");
          }
          if (event.type === "error") throw new Error(event.text);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "A mesa falhou.");
      setStatus("");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6 pb-24 sm:space-y-8 lg:pb-0">
      <AdminPageTitle
        title="Desenvolvimento político"
        subtitle="Gemini, Claude e GPT leem os documentos, conversam entre si e fecham o que produzir. Só admin."
      />

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </p>
      )}

      <section className={panelCardPadded}>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept=".pdf,.txt,.md,.markdown,application/pdf,text/plain"
              className="hidden"
              onChange={(e) => void onFile(e.target.files)}
            />
            <button
              type="button"
              disabled={Boolean(busy) || docs.length >= POLITICA_MAX_FILES}
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-4 py-3 text-sm text-white/70 hover:text-white disabled:opacity-40"
            >
              {busy === "doc" ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
              {docs.length
                ? "Adicionar documentos"
                : "Enviar documentos (PDF, TXT ou MD)"}
            </button>
            {docs.length ? (
              <ul className="space-y-1.5">
                {docs.map((doc) => (
                  <li
                    key={doc.name}
                    className="flex items-center justify-between gap-2 rounded-lg border border-white/10 px-3 py-2 text-sm text-white/70"
                  >
                    <span className="min-w-0 truncate">{doc.name}</span>
                    <button
                      type="button"
                      disabled={Boolean(busy)}
                      onClick={() =>
                        setDocs((prev) => prev.filter((item) => item.name !== doc.name))
                      }
                      className="rounded p-1 text-white/40 hover:text-white"
                      aria-label={`Tirar ${doc.name}`}
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="text-[11px] text-white/40">
              {docs.length
                ? `${docs.length} de ${POLITICA_MAX_FILES} · ${docs
                    .reduce((sum, doc) => sum + doc.text.length, 0)
                    .toLocaleString("pt-BR")} caracteres`
                : `Até ${POLITICA_MAX_FILES} arquivos.`}
            </p>
            <textarea
              className={cn(panelInput, "min-h-24")}
              placeholder="Opcional: o que você quer que a mesa resolva. Ex.: o que produzir esta semana."
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
            />
            <button
              type="button"
              disabled={Boolean(busy) || !docs.length}
              onClick={() => void openTable()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
            >
              {busy === "mesa" ? <Loader2 className="animate-spin" size={16} /> : <Landmark size={16} />}
              Abrir a mesa
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {POLITICA_SPEAKERS.map((speaker) => (
              <div
                key={speaker.id}
                className={cn("rounded-xl border px-3 py-3 text-xs", TONE[speaker.id])}
              >
                <p className="text-sm font-medium">{speaker.name}</p>
                <p className="mt-0.5 text-[11px] opacity-70">{speaker.house}</p>
                <p className="mt-2 leading-relaxed opacity-80">{speaker.job}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={cn(panelCardPadded, "space-y-4")}>
        <p className="text-xs uppercase tracking-[0.15em] text-white/40">Chat da mesa</p>
        {messages.length === 0 && !status && !consensus ? (
          <p className="text-sm text-white/40">
            Quando a mesa abrir, as três falam em sequência até concordarem.
          </p>
        ) : null}
        <div className="space-y-3">
          {messages.map((message) => {
            const meta = speakerMeta(message.speaker);
            return (
              <article
                key={message.id}
                className={cn("rounded-xl border px-4 py-3", TONE[message.speaker])}
              >
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]">
                  <span className="font-medium">{meta?.name}</span>
                  <span className="opacity-60">{meta?.house}</span>
                  <span className="opacity-50">rodada {message.round}</span>
                  {message.vote ? (
                    <span className="rounded-full border border-white/15 px-2 py-0.5">
                      {message.vote}
                    </span>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/90">
                  {message.text}
                </p>
                {message.proposal ? (
                  <p className="mt-2 text-[12px] text-white/55">Proposta: {message.proposal}</p>
                ) : null}
              </article>
            );
          })}
        </div>
        {status ? (
          <p className="flex items-center gap-2 text-sm text-white/50">
            <Loader2 className="animate-spin" size={14} />
            {status}
          </p>
        ) : null}
        {consensus ? (
          <article className="rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-4 text-sm leading-relaxed text-emerald-50">
            <p className="mb-2 text-xs uppercase tracking-[0.15em] text-emerald-200/70">
              Consenso
            </p>
            <p className="whitespace-pre-wrap">{consensus}</p>
          </article>
        ) : null}
        <div ref={bottomRef} />
      </section>
    </div>
  );
}
