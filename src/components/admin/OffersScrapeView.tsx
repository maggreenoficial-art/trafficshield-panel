"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Loader2,
  Radar,
  RefreshCw,
  Search,
  Upload,
} from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { panelCard, panelCardPadded, panelInput } from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import type { MetaAd, OfferMediaType } from "@/lib/offers/types";

type Config = {
  keywords: string;
  country: string;
  mediaType: OfferMediaType;
  hosts: string[];
  proxyCount: number;
  hasApiKey: boolean;
  apiKeyMasked: string;
};

type ProxyCheck = { host: string; ok: boolean; ip?: string; error?: string };

function formatWhen(iso: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function OffersScrapeView() {
  const [config, setConfig] = useState<Config | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [proxiesText, setProxiesText] = useState("");
  const [keywords, setKeywords] = useState("");
  const [country, setCountry] = useState("BR");
  const [mediaType, setMediaType] = useState<OfferMediaType>("all");
  const [ads, setAds] = useState<MetaAd[]>([]);
  const [usedProxy, setUsedProxy] = useState("");
  const [checks, setChecks] = useState<ProxyCheck[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadConfig();
  }, []);

  async function loadConfig() {
    setBusy("config");
    try {
      const res = await fetch("/api/admin/offers/config");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não leu a config.");
      applyConfig(data.config as Config);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler a config.");
    } finally {
      setBusy("");
    }
  }

  function applyConfig(next: Config) {
    setConfig(next);
    setKeywords(next.keywords);
    setCountry(next.country || "BR");
    setMediaType(next.mediaType || "all");
    setProxiesText("");
  }

  async function saveConfig(extra?: { apiKey?: string; proxies?: string[] }) {
    const res = await fetch("/api/admin/offers/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: extra?.apiKey ?? apiKey,
        proxies: extra?.proxies ?? proxiesText,
        keywords,
        country,
        mediaType,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Não salvou.");
    applyConfig(data.config as Config);
    setApiKey("");
    return data.config as Config;
  }

  async function syncApi() {
    setBusy("sync");
    setError("");
    try {
      if (apiKey.trim()) await saveConfig({ apiKey });
      const res = await fetch("/api/admin/offers/sync", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não sincronizou.");
      applyConfig(data.config as Config);
      setNotice(`Trouxe ${data.config.proxyCount} IPs da Proxy-Seller.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na API.");
    } finally {
      setBusy("");
    }
  }

  async function testProxies() {
    setBusy("test");
    setError("");
    try {
      await saveConfig();
      const res = await fetch("/api/admin/offers/test", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não testou.");
      setChecks(data.results ?? []);
      setNotice(`${data.ok} proxy(s) saindo na internet.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no teste.");
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
      const res = await fetch("/api/admin/offers/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não leu o arquivo.");
      applyConfig(data.config as Config);
      setNotice(`Li ${data.config.proxyCount} proxies do arquivo.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy("");
    }
  }

  async function search() {
    if (!keywords.trim()) {
      setError("Digite o tema ou as palavras-chave.");
      return;
    }
    setBusy("search");
    setError("");
    setNotice("");
    try {
      await saveConfig();
      const res = await fetch("/api/admin/offers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keywords, country, mediaType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não buscou as ofertas.");
      setAds(data.ads ?? []);
      setUsedProxy(data.proxy ?? "");
      setNotice(
        `${data.ads?.length ?? 0} anúncio(s) na Biblioteca da Meta${
          data.total && data.total > (data.ads?.length ?? 0)
            ? ` · ${data.total} no total`
            : ""
        }${data.proxy ? ` · ${data.proxy}` : ""}.`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na busca.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="space-y-6 pb-24 sm:space-y-8 lg:pb-0">
      <AdminPageTitle
        title="Scrapping de ofertas"
        subtitle="Entra na Biblioteca de Anúncios da Meta pelos IPs da Proxy-Seller. Você cola o tema e a busca gira os proxies."
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
          <h2 className="text-sm font-medium text-white">Tema</h2>
          <p className="mt-1 text-xs text-white/45">
            Palavra-chave igual na busca da Biblioteca da Meta. País e tipo filtram o resultado.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto]">
          <input
            className={cn(panelInput, "text-sm")}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Ex: emagrecer, implante dentário, cassilândia"
            onKeyDown={(e) => {
              if (e.key === "Enter") void search();
            }}
          />
          <select
            className={cn(panelInput, "text-sm")}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
          >
            <option value="BR">Brasil</option>
            <option value="US">EUA</option>
            <option value="PT">Portugal</option>
            <option value="MX">México</option>
            <option value="AR">Argentina</option>
            <option value="CO">Colômbia</option>
          </select>
          <select
            className={cn(panelInput, "text-sm")}
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as OfferMediaType)}
          >
            <option value="all">Tudo</option>
            <option value="video">Vídeo</option>
            <option value="image">Imagem</option>
          </select>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void search()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-black disabled:opacity-40"
          >
            {busy === "search" ? <Loader2 className="animate-spin" size={16} /> : <Search size={16} />}
            Buscar
          </button>
        </div>
      </section>

      <section className={cn(panelCardPadded, "space-y-4")}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-medium text-white">Proxies</h2>
            <p className="mt-1 text-xs text-white/45">
            API Proxy-Seller{config?.hasApiKey ? ` · ${config.apiKeyMasked}` : ""}.{" "}
            {config?.proxyCount ?? 0} IP(s) prontos. Cole a lista, mande o zip ou sincronize.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void syncApi()}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 disabled:opacity-40"
            >
              {busy === "sync" ? <Loader2 className="animate-spin" size={12} /> : <RefreshCw size={12} />}
              Sincronizar API
            </button>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void testProxies()}
              className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 disabled:opacity-40"
            >
              {busy === "test" ? <Loader2 className="animate-spin" size={12} /> : <Radar size={12} />}
              Testar IPs
            </button>
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
        <input
          className={cn(panelInput, "text-sm")}
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={config?.hasApiKey ? "API key já salva. Cole outra para trocar." : "API key da Proxy-Seller"}
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
          placeholder="Cole proxies novos (host:porta@usuario:senha). O painel não mostra a senha."
        />
        {checks.length > 0 && (
          <ul className="grid gap-1 sm:grid-cols-2">
            {checks.map((item) => (
              <li
                key={item.host}
                className={cn(
                  "rounded-lg px-3 py-2 text-[11px]",
                  item.ok ? "bg-emerald-500/10 text-emerald-100" : "bg-red-500/10 text-red-200"
                )}
              >
                {item.host}
                {item.ok ? ` · ${item.ip}` : ` · ${item.error}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-white">
          Ofertas{usedProxy ? ` · ${usedProxy}` : ""}
        </h2>
        {!ads.length && busy !== "search" && (
          <p className="text-sm text-white/40">Nenhuma busca ainda. Coloque o tema e clique em Buscar.</p>
        )}
        <ul className="grid gap-3 lg:grid-cols-2">
          {ads.map((ad) => (
            <li key={ad.id} className={cn(panelCard, "p-4")}>
              <div className="mb-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/55">
                  {ad.videoUrl ? "Vídeo" : ad.imageUrl ? "Imagem" : "Texto"}
                </span>
                {ad.platforms.slice(0, 3).map((platform) => (
                  <span
                    key={platform}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-white/45"
                  >
                    {platform.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
              <p className="text-sm font-medium text-white/85">{ad.pageName}</p>
              {ad.title && <p className="mt-1 text-sm text-white/70">{ad.title}</p>}
              {ad.startDate && (
                <p className="mt-1 text-xs text-white/45">{formatWhen(ad.startDate)}</p>
              )}
              {ad.body && (
                <p className="mt-2 line-clamp-4 text-xs text-white/50">{ad.body}</p>
              )}
              {ad.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.imageUrl}
                  alt=""
                  className="mt-3 h-40 w-full rounded-lg object-cover"
                />
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={ad.snapshotUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:text-white"
                >
                  <ExternalLink size={12} />
                  Ver na Meta
                </a>
                {ad.linkUrl && (
                  <a
                    href={ad.linkUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:text-white"
                  >
                    <ExternalLink size={12} />
                    {ad.cta || "Oferta"}
                  </a>
                )}
                {ad.videoUrl && (
                  <a
                    href={ad.videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:text-white"
                  >
                    <Download size={12} />
                    Vídeo
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
