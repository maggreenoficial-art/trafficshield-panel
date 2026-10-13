"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { panelCardPadded, panelInput } from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import { REPORT_CHANNEL_LABEL, type ReportLog } from "@/lib/reports/channels";
import { vercelUrlIssue } from "@/lib/reports/vercel-form";

type PublicConfig = {
  hosts: string[];
  proxyCount: number;
  reporterName: string;
  reporterEmail: string;
};

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReportsView() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [logs, setLogs] = useState<ReportLog[]>([]);
  const [reporterName, setReporterName] = useState("");
  const [reporterEmail, setReporterEmail] = useState("");
  const [infringingUrl, setInfringingUrl] = useState("https://orelhometro.vercel.app/");
  const [realContentUrl, setRealContentUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [realError, setRealError] = useState("");
  const [forwardToOwner, setForwardToOwner] = useState(false);
  const [includeContact, setIncludeContact] = useState(false);
  const [impacted, setImpacted] = useState(false);
  const [steps, setSteps] = useState(
    "Pede para mandar um Pix com recado e abre um formulário de pagamento."
  );
  const [proxiesText, setProxiesText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    setBusy("config");
    try {
      const res = await fetch("/api/admin/reports/config");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não leu as denúncias.");
      applyConfig(data.config as PublicConfig);
      setLogs(data.logs ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler.");
    } finally {
      setBusy("");
    }
  }

  function applyConfig(next: PublicConfig) {
    setConfig(next);
    setReporterName(next.reporterName);
    setReporterEmail(next.reporterEmail);
    setProxiesText("");
  }

  function checkUrl(value: string, optional: boolean) {
    if (optional && !value.trim()) return "";
    return vercelUrlIssue(value) ?? "";
  }

  async function saveProxies() {
    setBusy("save");
    setError("");
    try {
      const res = await fetch("/api/admin/reports/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxies: proxiesText,
          reporterName,
          reporterEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não salvou a lista.");
      applyConfig(data.config as PublicConfig);
      setNotice(`${data.config.proxyCount} proxy(s) prontos para denunciar.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setBusy("");
    }
  }

  async function uploadFile(file: File | undefined) {
    if (!file) return;
    setBusy("upload");
    setError("");
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/admin/reports/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não leu o arquivo.");
      applyConfig(data.config as PublicConfig);
      setNotice(`Li ${data.config.proxyCount} proxies do arquivo.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy("");
    }
  }

  async function send(form: HTMLFormElement) {
    const nextUrlError = checkUrl(infringingUrl, false);
    const nextRealError = checkUrl(realContentUrl, true);
    setUrlError(nextUrlError);
    setRealError(nextRealError);
    if (nextUrlError || nextRealError) return;
    setBusy("send");
    setError("");
    setNotice("A Kie está criando um dado novo para cada proxy.");
    try {
      let guard = 0;
      while (guard < 600) {
        guard += 1;
        const body = new FormData(form);
        body.set("infringingUrl", infringingUrl);
        body.set("realContentUrl", realContentUrl);
        body.set("reporterOrUserWasImpacted", impacted ? "Yes" : "No");
        if (!forwardToOwner) body.delete("includeContactInReportToWebsiteOwner");
        if (!impacted) body.delete("personalImpactEvidence");
        const res = await fetch("/api/admin/reports/send", { method: "POST", body });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Não enviou a denúncia.");
        if (data.logs) setLogs(data.logs);
        const progress = data.progress as {
          phase?: string;
          ready?: number;
          sent?: number;
          total?: number;
        };
        const total = progress.total ?? 0;
        const ready = progress.ready ?? 0;
        const sent = progress.sent ?? 0;
        setNotice(
          progress.phase === "generate"
            ? `Dados novos: ${ready} de ${total}. Cada proxy recebe uma pessoa e um texto.`
            : `Denúncias enviadas: ${sent} de ${total}.`
        );
        if (progress.phase === "send" && total > 0 && sent >= total) break;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao denunciar.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6 pb-24 sm:space-y-8 lg:pb-0">
      <AdminPageTitle
        title="Denúncias"
        subtitle="Todas as denúncias levam os mesmos prints: a página que pede o Pix e o formulário de pagamento."
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

      <form
        className={cn(panelCardPadded, "space-y-4")}
        onSubmit={(event) => {
          event.preventDefault();
          void send(event.currentTarget);
        }}
      >
        <div>
          <h2 className="text-sm font-medium text-white">Denuncie abusos no Vercel</h2>
          <p className="mt-1 text-xs text-white/45">
            Os dois prints abaixo vão em todas as denúncias. A Kie cria nome e e-mail. O título
            descreve o Pix que aparece neles.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-white/70">Tipo de abuso</span>
          <select name="abuseType" className={cn(panelInput, "text-sm")} defaultValue="Phishing">
            <option value="Phishing">Phishing ou malware</option>
          </select>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-xs text-white/70">Encaminhar denúncia de abuso</legend>
          <label className="flex items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              name="forwardReportToWebsiteOwner"
              value="on"
              checked={forwardToOwner}
              onChange={(e) => {
                setForwardToOwner(e.target.checked);
                if (!e.target.checked) setIncludeContact(false);
              }}
              className="mt-1"
            />
            Encaminhe meu relatório ao proprietário do site.
          </label>
          <label className="flex items-start gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              name="includeContactInReportToWebsiteOwner"
              value="on"
              checked={includeContact}
              disabled={!forwardToOwner}
              onChange={(e) => setIncludeContact(e.target.checked)}
              className="mt-1 disabled:opacity-40"
            />
            Inclua meu nome e contato no relatório enviado ao proprietário do site.
          </label>
        </fieldset>

        <label className="block space-y-1.5">
          <span className="text-xs text-white/70">URL relatada</span>
          <input
            name="infringingUrl"
            className={cn(panelInput, "text-sm", urlError && "border-red-400/70")}
            value={infringingUrl}
            onChange={(e) => {
              setInfringingUrl(e.target.value);
              if (urlError) setUrlError(checkUrl(e.target.value, false));
            }}
            onBlur={() => setUrlError(checkUrl(infringingUrl, false))}
            placeholder="https://example.com"
            required
          />
          {urlError ? <span className="text-xs text-red-300">{urlError}</span> : null}
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs text-white/70">URL do site ou da marca imitada (opcional)</span>
          <input
            name="realContentUrl"
            className={cn(panelInput, "text-sm", realError && "border-red-400/70")}
            value={realContentUrl}
            onChange={(e) => {
              setRealContentUrl(e.target.value);
              if (realError) setRealError(checkUrl(e.target.value, true));
            }}
            onBlur={() => setRealError(checkUrl(realContentUrl, true))}
            placeholder="https://example.com"
          />
          {realError ? <span className="text-xs text-red-300">{realError}</span> : null}
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs text-white/70">Impacto pessoal</span>
          <span className="block text-[11px] text-white/40">
            Anexe provas se você ou algum usuário foi afetado pessoalmente.
          </span>
          <select
            className={cn(panelInput, "text-sm")}
            value={impacted ? "Yes" : "No"}
            onChange={(e) => setImpacted(e.target.value === "Yes")}
          >
            <option value="No">Não</option>
            <option value="Yes">Sim</option>
          </select>
        </label>

        <label className={cn("block space-y-1.5", !impacted && "opacity-50")}>
          <span className="text-xs text-white/70">Evidências de impacto pessoal</span>
          <input
            name="personalImpactEvidence"
            type="file"
            accept=".gif,.jpg,.jpeg,.png,image/gif,image/jpeg,image/png"
            multiple
            disabled={!impacted}
            className="block w-full text-xs text-white/70 file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:text-white"
          />
          <span className="block text-[11px] text-white/40">
            Até 5 arquivos GIF, JPG ou PNG. O total não passa de 2 MB.
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-xs text-white/70">Prints de todas as denúncias</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <img
              src="/denuncias/orelhometro-pagina.png"
              alt="Página que pede para mandar um Pix"
              className="h-40 w-full rounded-lg border border-white/10 object-cover object-top"
            />
            <img
              src="/denuncias/orelhometro-pix.png"
              alt="Formulário de pagamento do Pix"
              className="h-40 w-full rounded-lg border border-white/10 object-cover object-top"
            />
          </div>
          <p className="text-[11px] text-white/40">
            A página que pede o Pix e o formulário de pagamento entram em cada envio.
          </p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs text-white/70">O que o site falso faz</span>
          <span className="block text-[11px] text-white/40">
            O título descreve o que estes prints mostram: a página pede um Pix e abre um
            formulário de pagamento. Há mil variações.
          </span>
          <textarea
            name="whatItIs"
            className={cn(panelInput, "min-h-28 text-sm")}
            value={steps}
            maxLength={800}
            onChange={(e) => setSteps(e.target.value)}
            placeholder="Pede para mandar um Pix com recado e abre um formulário de pagamento."
            required
          />
        </label>

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-white/40">
            Ao enviar, o relatório segue o formulário da Vercel, por um proxy da lista.
          </p>
          <button
            type="submit"
            disabled={Boolean(busy)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
          >
            {busy === "send" ? <Loader2 className="animate-spin" size={16} /> : null}
            {busy === "send" ? "Gerando e enviando…" : "Gerar e enviar"}
          </button>
        </div>
      </form>

      <section className={cn(panelCardPadded, "space-y-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-white">Lista de proxies</h2>
            <p className="mt-1 text-xs text-white/45">
              {config?.proxyCount ?? 0} IP(s) prontos. Cole a lista ou mande o arquivo. A senha
              não aparece de novo.
            </p>
          </div>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 disabled:opacity-40"
          >
            {busy === "upload" ? <Loader2 className="animate-spin" size={12} /> : <Upload size={12} />}
            Zip ou txt
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.csv,.zip,.lst"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            void uploadFile(file);
          }}
        />
        {Boolean(config?.hosts.length) && (
          <ul className="flex flex-wrap gap-1.5">
            {config!.hosts.map((host) => (
              <li
                key={host}
                className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] text-white/55"
              >
                {host}
              </li>
            ))}
          </ul>
        )}
        <textarea
          className={cn(panelInput, "min-h-24 font-mono text-xs")}
          value={proxiesText}
          onChange={(e) => setProxiesText(e.target.value)}
          placeholder="Cole proxies novos (host:porta@usuario:senha)."
        />
        <button
          type="button"
          disabled={Boolean(busy)}
          onClick={() => void saveProxies()}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy === "save" ? <Loader2 className="animate-spin" size={16} /> : null}
          Salvar lista
        </button>
      </section>

      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium text-white">Envios recentes</h2>
          <p className="mt-1 text-xs text-white/45">Últimos relatórios enviados à Vercel.</p>
        </div>
        {!logs.length && busy !== "config" && (
          <p className="text-sm text-white/40">Nenhuma denúncia ainda.</p>
        )}
        {logs.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-white/45">
                <tr>
                  <th className="px-3 py-2 font-medium">Entrega</th>
                  <th className="px-3 py-2 font-medium">Resposta</th>
                  <th className="px-3 py-2 font-medium">Alvo</th>
                  <th className="px-3 py-2 font-medium">Categoria</th>
                  <th className="px-3 py-2 font-medium">Título</th>
                  <th className="px-3 py-2 font-medium">Data</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const result = log.results[0];
                  const ok = Boolean(result?.ok);
                  return (
                    <tr key={log.id} className="border-t border-white/10 text-white/80">
                      <td className={cn("px-3 py-2", ok ? "text-emerald-300" : "text-amber-200")}>
                        {ok ? "Enviada" : "Falhou"}
                      </td>
                      <td className="px-3 py-2">{ok ? "Aguardando" : result?.detail || "—"}</td>
                      <td className="max-w-48 truncate px-3 py-2">{log.url}</td>
                      <td className="px-3 py-2">
                        {result ? REPORT_CHANNEL_LABEL[result.channel] : "Vercel"} · Phishing
                      </td>
                      <td className="max-w-56 truncate px-3 py-2">{log.note}</td>
                      <td className="whitespace-nowrap px-3 py-2">{formatWhen(log.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
