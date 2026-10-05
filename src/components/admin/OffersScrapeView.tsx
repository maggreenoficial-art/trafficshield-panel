"use client";

import { useEffect, useRef, useState } from "react";
import {
  Download,
  ExternalLink,
  Eye,
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
import { OFFER_NICHE_LABELS, type OfferNicheId } from "@/lib/offers/niche";
import type { OfferScaleReport } from "@/lib/offers/scale";
import type { WatchedOfferPage } from "@/lib/db/offer-watch";

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

const verdictTone: Record<OfferScaleReport["verdict"], string> = {
  scaling: "bg-emerald-500/15 text-emerald-200",
  validated: "bg-sky-500/15 text-sky-200",
  testing: "bg-amber-500/15 text-amber-200",
  mature: "bg-white/10 text-white/65",
  none: "bg-red-500/15 text-red-200",
};

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
  const [report, setReport] = useState<OfferScaleReport | null>(null);
  const [watched, setWatched] = useState<WatchedOfferPage[]>([]);
  const [usedProxy, setUsedProxy] = useState("");
  const [checks, setChecks] = useState<ProxyCheck[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    void loadConfig();
    void loadWatched();
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

  async function loadWatched() {
    try {
      const res = await fetch("/api/admin/offers/watch");
      const data = await res.json();
      if (res.ok) setWatched(data.pages ?? []);
    } catch {
      /* ignore */
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

  async function search(hunt = false) {
    if (!hunt && !keywords.trim()) {
      setError("Digite o tema no recorte, ou clique em Caçar nichos.");
      return;
    }
    setBusy("search");
    setError("");
    setNotice("");
    try {
      if (!hunt) await saveConfig();
      const res = await fetch("/api/admin/offers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keywords: hunt ? "" : keywords,
          country,
          mediaType,
          hunt,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não buscou as ofertas.");
      setAds(data.ads ?? []);
      setReport(data.report ?? null);
      setWatched(data.watched ?? []);
      setUsedProxy(data.proxy ?? "");
      const kept = data.ads?.length ?? 0;
      const dropped = data.dropped ?? 0;
      const intent = data.plan?.intent || data.plan?.query || keywords;
      if (data.report?.inNiche === false) {
        setError(
          data.report.outOfNicheReason ||
            "Fora do recorte. Só produtos e infoprodutos de direita, conservador, evangélico, cristão, patriota e famílias."
        );
      } else {
        setNotice(
          `${kept} anúncio(s) do recorte${dropped ? ` · ${dropped} fora` : ""}${
            data.report?.verdictLabel ? ` · ${data.report.verdictLabel}` : ""
          } · ${intent}${data.brief ? ` · ${data.brief}` : ""}${data.proxy ? ` · ${data.proxy}` : ""}.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na busca.");
    } finally {
      setBusy("");
    }
  }

  async function watchPage(ad: MetaAd) {
    setError("");
    try {
      const res = await fetch("/api/admin/offers/watch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pageId: ad.pageId,
          pageName: ad.pageName,
          keywords,
          country,
          adCount: ads.filter((item) => item.pageName === ad.pageName).length,
          linkUrl: ad.linkUrl,
          snapshotUrl: ad.snapshotUrl,
          reason: ad.review?.why || "Marcada para acompanhamento.",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não acompanhou.");
      setWatched(data.pages ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao acompanhar.");
    }
  }

  async function unwatchPage(page: Pick<WatchedOfferPage, "pageId" | "pageName">) {
    const params = new URLSearchParams();
    if (page.pageId) params.set("pageId", page.pageId);
    params.set("pageName", page.pageName);
    const res = await fetch(`/api/admin/offers/watch?${params.toString()}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (res.ok) setWatched(data.pages ?? []);
  }

  const watching = new Set(
    watched.flatMap((page) =>
      [page.pageId, page.pageName.toLowerCase()].filter(Boolean) as string[]
    )
  );

  return (
    <div className="space-y-6 pb-24 sm:space-y-8 lg:pb-0">
      <AdminPageTitle
        title="Scrapping de ofertas"
        subtitle="O Grok caça só produtos e infoprodutos de direita, conservador, evangélico, cristão, patriota e famílias. Lê cada anúncio. 20 ou mais = escala. Oferta boa vai para acompanhamento."
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
            Recorte fechado: direita, conservador, evangélico, cristão, patriota e
            famílias. O Grok planeja as frases, entra na Meta e lê anúncio por
            anúncio — não é triagem rasa. Escala só com 20 anúncios relevantes.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-[1fr_8rem_8rem_auto_auto]">
          <input
            className={cn(panelInput, "text-sm")}
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="Ex: curso família cristã, mentoria conservadora"
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
            {busy === "search" ? "Grok lendo…" : "Buscar"}
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() => void search(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-40"
          >
            {busy === "search" ? <Loader2 className="animate-spin" size={16} /> : <Radar size={16} />}
            Caçar nichos
          </button>
        </div>
      </section>

      {report && (
        <section className={cn(panelCardPadded, "space-y-3")}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                verdictTone[report.verdict]
              )}
            >
              {report.verdictLabel}
            </span>
            <p className="text-xs leading-relaxed text-white/55">{report.verdictBody}</p>
          </div>
          {(report.query || report.intent) && (
            <p className="text-xs text-white/40">
              Busca: {report.query || report.intent}
              {report.niches?.length
                ? ` · ${report.niches
                    .map((id) => OFFER_NICHE_LABELS[id as OfferNicheId] ?? id)
                    .join(", ")}`
                : ""}
            </p>
          )}
          {report.brief ? (
            <p className="text-xs leading-relaxed text-white/55">{report.brief}</p>
          ) : null}
        </section>
      )}

      {watched.length > 0 && (
        <section className={cn(panelCardPadded, "space-y-3")}>
          <h2 className="text-sm font-medium text-white">Páginas em acompanhamento</h2>
          <p className="text-xs text-white/45">
            O Grok marca sozinho página de oferta boa do recorte. Você também marca na mão.
          </p>
          <ul className="space-y-2">
            {watched.map((page) => (
              <li
                key={`${page.pageId || page.pageName}-${page.watchedAt}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/70"
              >
                <span className="min-w-0 truncate">
                  {page.pageName}
                  {page.keywords ? ` · ${page.keywords}` : ""}
                  {page.adCount ? ` · ${page.adCount} anúncios` : ""}
                  {page.reason ? ` · ${page.reason}` : ""}
                </span>
                <button
                  type="button"
                  onClick={() => void unwatchPage(page)}
                  className="shrink-0 text-[11px] text-white/40 hover:text-red-300"
                >
                  tirar
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

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
          <p className="text-sm text-white/40">
            {report?.inNiche === false
              ? "Esse tema não entra no recorte. Troque a busca ou clique em Caçar nichos."
              : "Nenhuma busca ainda. Digite um tema do recorte ou clique em Caçar nichos."}
          </p>
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
              {ad.review?.niches?.length ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {ad.review.niches.map((id) => (
                    <span
                      key={id}
                      className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] text-violet-200"
                    >
                      {OFFER_NICHE_LABELS[id as OfferNicheId] ?? id}
                    </span>
                  ))}
                  {ad.review.productType !== "none" ? (
                    <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/50">
                      {ad.review.productType}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {ad.title && <p className="mt-1 text-sm text-white/70">{ad.title}</p>}
              {ad.startDate && (
                <p className="mt-1 text-xs text-white/45">{formatWhen(ad.startDate)}</p>
              )}
              {ad.body && (
                <p className="mt-2 line-clamp-4 text-xs text-white/50">{ad.body}</p>
              )}
              {ad.review?.why ? (
                <p className="mt-2 text-xs leading-relaxed text-violet-200/80">
                  {ad.review.why}
                </p>
              ) : null}
              {ad.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={ad.imageUrl}
                  alt=""
                  className="mt-3 h-40 w-full rounded-lg object-cover"
                />
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    watching.has(ad.pageId || "") || watching.has(ad.pageName.toLowerCase())
                      ? void unwatchPage(ad)
                      : void watchPage(ad)
                  }
                  className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[11px] text-white/70 hover:text-white"
                >
                  <Eye size={12} />
                  {watching.has(ad.pageId || "") || watching.has(ad.pageName.toLowerCase())
                    ? "Acompanhando"
                    : "Acompanhar página"}
                </button>
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
