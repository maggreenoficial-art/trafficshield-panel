"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  MessageCircle,
  Share2,
  Sparkles,
  ThumbsUp,
  Upload,
} from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import { CopyNameButton } from "@/components/admin/CopyNameButton";
import {
  panelCard,
  panelCardPadded,
  panelTableHead,
  panelTableWrap,
} from "@/lib/panel-styles";
import { cn } from "@/lib/utils";
import {
  parseAdsManagerExport,
  type AdsEngagementRow,
} from "@/lib/ads-analysis/parse-ads-export";
import {
  analyzeTriple,
  type AnalyzedAd,
  type AnalysisLevel,
  type EngagementAnalysis,
  type TripleEngagementAnalysis,
} from "@/lib/ads-analysis/analyze-engagement";
import {
  emptyThemeOverrides,
  mergeThemeFileNames,
  THEME_KEYS,
  THEME_LABELS,
  toggleCampaignTheme,
  type CreativeTheme,
  type ThemeOverrides,
} from "@/lib/ads-analysis/theme-champions";
import {
  rankCreativesAlgorithm,
  type GrokCreativeRanking,
} from "@/lib/ads-analysis/rank-creatives";

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function pct(n: number) {
  return `${(n * 100).toFixed(2)}%`;
}

function num(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

const verdictLabel: Record<AnalyzedAd["verdict"], { text: string; className: string }> = {
  winner: { text: "Escalar", className: "bg-emerald-500/15 text-emerald-200" },
  ok: { text: "Ok", className: "bg-white/10 text-white/60" },
  fatigue: { text: "Fadiga", className: "bg-amber-500/15 text-amber-200" },
  weak: { text: "Fraco", className: "bg-red-500/15 text-red-200" },
};

const insightTone: Record<string, string> = {
  good: "border-emerald-500/25 bg-emerald-500/8",
  warn: "border-amber-500/25 bg-amber-500/8",
  bad: "border-red-500/25 bg-red-500/8",
  info: "border-sky-500/25 bg-sky-500/8",
};

type Slot = "campaign" | "adset" | "ad";

const SLOTS: { id: Slot; title: string; hint: string }[] = [
  { id: "campaign", title: "1. Campanhas", hint: "Breakdown: Campanha" },
  { id: "adset", title: "2. Conjuntos", hint: "Breakdown: Conjunto de anúncios" },
  { id: "ad", title: "3. Anúncios", hint: "Breakdown: Anúncio" },
];

export function CampaignAnalysisView() {
  const inputRefs = {
    campaign: useRef<HTMLInputElement>(null),
    adset: useRef<HTMLInputElement>(null),
    ad: useRef<HTMLInputElement>(null),
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [files, setFiles] = useState<Record<Slot, { name: string; rows: AdsEngagementRow[] } | null>>({
    campaign: null,
    adset: null,
    ad: null,
  });
  const [analysis, setAnalysis] = useState<TripleEngagementAnalysis | null>(null);
  const [tab, setTab] = useState<AnalysisLevel>("ad");
  const [saved, setSaved] = useState<
    { id: string; title: string; createdAt: string }[]
  >([]);
  const [saveMsg, setSaveMsg] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [grokBusy, setGrokBusy] = useState(false);
  const [grok, setGrok] = useState<GrokCreativeRanking | null>(null);
  const [themeOverrides, setThemeOverrides] = useState<ThemeOverrides>(emptyThemeOverrides);
  const [themePacks, setThemePacks] = useState<
    { theme: CreativeTheme; name: string; rows: AdsEngagementRow[] }[]
  >([]);
  const themeInputRefs = useRef<Partial<Record<CreativeTheme, HTMLInputElement | null>>>({});

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/admin/campaign-analyses");
        const data = await res.json();
        if (res.ok) setSaved(data.analyses ?? []);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  async function onSlotFile(slot: Slot, list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setError("");
    try {
      const { rows } = parseAdsManagerExport(await file.text());
      if (!rows.length) throw new Error(`${SLOTS.find((s) => s.id === slot)?.title}: arquivo sem linhas.`);
      setFiles((prev) => ({ ...prev, [slot]: { name: file.name, rows } }));
      setAnalysis(null);
      setGrok(null);
      setSavedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    } finally {
      const el = inputRefs[slot].current;
      if (el) el.value = "";
    }
  }

  async function runAnalysis() {
    if (!files.campaign || !files.adset || !files.ad) {
      setError("Envie os 3 CSVs: Campanhas, Conjuntos e Anúncios.");
      return;
    }
    setBusy(true);
    setError("");
    setSaveMsg("");
    setGrok(null);
    setSavedId(null);
    try {
      const result = analyzeTriple(
        files.campaign.rows,
        files.adset.rows,
        files.ad.rows,
        themeOverrides
      );
      setAnalysis(result);
      setTab("ad");

      const res = await fetch("/api/admin/campaign-analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignFileName: files.campaign.name,
          adsetFileName: files.adset.name,
          adFileName: files.ad.name,
          campaignRows: files.campaign.rows,
          adsetRows: files.adset.rows,
          adRows: files.ad.rows,
          result,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg(data.error || "Análise feita, mas não salvou no banco.");
      } else {
        setSaveMsg("Salvo no Supabase.");
        setSavedId(data.analysis.id);
        setSaved((prev) => [
          {
            id: data.analysis.id,
            title: data.analysis.title,
            createdAt: data.analysis.createdAt,
          },
          ...prev.filter((x) => x.id !== data.analysis.id),
        ]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setBusy(false);
    }
  }

  async function loadSaved(id: string) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/campaign-analyses?id=${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não encontrado");
      setAnalysis(data.analysis.result);
      setGrok(data.analysis.result?.grok ?? null);
      setThemeOverrides(data.analysis.result?.themeOverrides ?? emptyThemeOverrides());
      setSavedId(id);
      setFiles({
        campaign: {
          name: data.analysis.campaignFileName || "campanhas.csv",
          rows: data.analysis.campaignRows ?? [],
        },
        adset: {
          name: data.analysis.adsetFileName || "conjuntos.csv",
          rows: data.analysis.adsetRows ?? [],
        },
        ad: {
          name: data.analysis.adFileName || "anuncios.csv",
          rows: data.analysis.adRows ?? [],
        },
      });
      setTab("ad");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao abrir.");
    } finally {
      setBusy(false);
    }
  }

  async function runGrokRanking() {
    if (!analysis?.ad.ads.length) return;
    setGrokBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/campaign-analyses/grok", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ads: analysis.ad.ads,
          analysisId: savedId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Grok falhou.");
      setGrok(data.grok);
      setAnalysis((prev) => (prev ? { ...prev, grok: data.grok } : prev));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha no Grok 4.6.");
    } finally {
      setGrokBusy(false);
    }
  }

  async function persistAnalysis(next: TripleEngagementAnalysis, id: string | null) {
    if (!id) return;
    try {
      await fetch("/api/admin/campaign-analyses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, result: next }),
      });
    } catch {
      /* ignore */
    }
  }

  function retag(nextOverrides: ThemeOverrides, keepGrok = true) {
    if (!files.campaign || !files.adset || !files.ad) {
      setThemeOverrides(nextOverrides);
      return;
    }
    const result = analyzeTriple(
      files.campaign.rows,
      files.adset.rows,
      files.ad.rows,
      nextOverrides
    );
    const next = keepGrok && grok ? { ...result, grok } : result;
    setThemeOverrides(nextOverrides);
    setAnalysis(next);
    void persistAnalysis(next, savedId);
  }

  async function onThemeFile(theme: CreativeTheme, list: FileList | null) {
    const chosen = list ? [...list] : [];
    const el = themeInputRefs.current[theme];
    if (el) el.value = "";
    if (!chosen.length) return;
    setError("");
    try {
      const added: { theme: CreativeTheme; name: string; rows: AdsEngagementRow[] }[] = [];
      for (const file of chosen) {
        const { rows } = parseAdsManagerExport(await file.text());
        if (!rows.length) {
          throw new Error(`${THEME_LABELS[theme]}: ${file.name} sem linhas.`);
        }
        added.push({ theme, name: file.name, rows });
      }
      const packs = [...themePacks, ...added];
      setThemePacks(packs);
      let fileNames = emptyThemeOverrides().fileNames;
      for (const pack of packs) {
        fileNames = mergeThemeFileNames(fileNames, pack.theme, pack.rows);
      }
      const nextOverrides = { ...themeOverrides, fileNames };
      if (files.campaign && files.adset && files.ad && analysis) {
        retag(nextOverrides);
      } else {
        setThemeOverrides(nextOverrides);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler CSV do tema.");
    }
  }

  function removeThemePack(index: number) {
    const packs = themePacks.filter((_, i) => i !== index);
    setThemePacks(packs);
    let fileNames = emptyThemeOverrides().fileNames;
    for (const pack of packs) {
      fileNames = mergeThemeFileNames(fileNames, pack.theme, pack.rows);
    }
    const nextOverrides = { ...themeOverrides, fileNames };
    if (analysis) retag(nextOverrides);
    else setThemeOverrides(nextOverrides);
  }

  function onToggleCampaignTheme(campaign: string, theme: CreativeTheme, currentlyOn: boolean) {
    retag(toggleCampaignTheme(themeOverrides, campaign, theme, currentlyOn));
  }

  const active: EngagementAnalysis | null = analysis ? analysis[tab] : null;
  const algoRanking = useMemo(
    () => (analysis ? rankCreativesAlgorithm(analysis.ad.ads, 20) : []),
    [analysis]
  );

  const kpis = useMemo(() => {
    if (!analysis) return [];
    const t = analysis.ad.totals;
    return [
      { label: "Campanhas", value: String(analysis.campaign.totals.ads), icon: BarChart3 },
      { label: "Conjuntos", value: String(analysis.adset.totals.ads), icon: Sparkles },
      { label: "Anúncios", value: String(analysis.ad.totals.ads), icon: FileSpreadsheet },
      { label: "Gasto (anúncios)", value: brl(t.spend), icon: ThumbsUp },
      { label: "ER médio", value: pct(t.engagementRate), icon: MessageCircle },
      {
        label: "Custo / engaj. post",
        value: t.costPerEngagement ? brl(t.costPerEngagement) : "—",
        icon: Share2,
      },
    ];
  }, [analysis]);

  const ready = Boolean(files.campaign && files.adset && files.ad);

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Analise"
        subtitle="Sempre 3 CSVs do Gerenciador: Campanhas, Conjuntos e Anúncios — mesmas colunas de engajamento."
      />

      <section className={cn(panelCard, "space-y-4 p-5")}>
        <p className="text-xs leading-relaxed text-white/45">
          No Ads, exporte três vezes (nível Campanha / Conjunto / Anúncio) com as
          22 colunas de engajamento. O cruzamento diz se o problema é estrutura,
          público ou criativo.
        </p>
        <div className="grid gap-3 md:grid-cols-3">
          {SLOTS.map((slot) => {
            const current = files[slot.id];
            return (
              <div key={slot.id}>
                <input
                  ref={inputRefs[slot.id]}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  className="hidden"
                  onChange={(e) => void onSlotFile(slot.id, e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => inputRefs[slot.id].current?.click()}
                  className={cn(
                    "flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-8 text-center text-sm transition",
                    current
                      ? "border-emerald-500/40 bg-emerald-500/8 text-emerald-100"
                      : "border-white/15 bg-white/[0.02] text-white/55 hover:border-sky-500/40 hover:bg-sky-500/5"
                  )}
                >
                  {current ? (
                    <CheckCircle2 size={20} className="text-emerald-400" />
                  ) : (
                    <Upload size={20} className="text-white/35" />
                  )}
                  <span className="font-medium">{slot.title}</span>
                  <span className="text-[11px] text-white/40">{slot.hint}</span>
                  {current && (
                    <span className="max-w-full truncate text-[11px] text-white/50">
                      {current.name} · {current.rows.length} linhas
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          <p className="text-[11px] uppercase tracking-wide text-white/35">
            Arquivos por tema (opcional)
          </p>
          <p className="text-xs leading-relaxed text-white/40">
            Se o nome não deixa o tema óbvio, exporte no Gerenciador só aquele
            recorte (campanha, conjunto ou anúncio) e solte aqui. Ex.: CSV só das
            campanhas de mulheres. O algoritmo também lê nomes como “agressores
            de mulheres”.
          </p>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {THEME_KEYS.map((theme) => (
              <div key={theme}>
                <input
                  ref={(el) => {
                    themeInputRefs.current[theme] = el;
                  }}
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  multiple
                  className="hidden"
                  onChange={(e) => void onThemeFile(theme, e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => themeInputRefs.current[theme]?.click()}
                  className="w-full rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-3 py-4 text-center text-xs text-white/55 hover:border-sky-500/40 hover:bg-sky-500/5"
                >
                  <span className="block font-medium text-white/80">
                    {THEME_LABELS[theme]}
                  </span>
                  <span className="mt-1 block text-[11px] text-white/35">
                    Campanha, conjunto ou anúncio
                  </span>
                </button>
              </div>
            ))}
          </div>
          {themePacks.length > 0 && (
            <ul className="space-y-1">
              {themePacks.map((pack, i) => (
                <li
                  key={`${pack.theme}-${pack.name}-${i}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs text-white/55"
                >
                  <span className="truncate">
                    {THEME_LABELS[pack.theme]} · {pack.name} · {pack.rows.length}{" "}
                    linhas
                  </span>
                  <button
                    type="button"
                    onClick={() => removeThemePack(i)}
                    className="shrink-0 text-[11px] text-white/35 hover:text-red-300"
                  >
                    tirar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button
          type="button"
          disabled={!ready || busy}
          onClick={runAnalysis}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 py-3 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? <Loader2 className="animate-spin" size={16} /> : null}
          Analisar os 3 arquivos
        </button>
        {error && <p className="text-sm text-red-300">{error}</p>}
        {saveMsg && <p className="text-sm text-emerald-300/90">{saveMsg}</p>}
        {saved.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wide text-white/35">
              Análises salvas
            </p>
            <ul className="space-y-1">
              {saved.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => void loadSaved(item.id)}
                    className="w-full truncate rounded-lg px-3 py-2 text-left text-xs text-white/55 hover:bg-white/[0.04] hover:text-white/80"
                  >
                    {item.title} ·{" "}
                    {new Date(item.createdAt).toLocaleString("pt-BR")}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {analysis && active && (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {kpis.map((k) => {
              const Icon = k.icon;
              return (
                <div key={k.label} className={cn(panelCardPadded, "flex items-center gap-3")}>
                  <div className="rounded-lg bg-sky-500/15 p-2 text-sky-300">
                    <Icon size={16} />
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-white/35">
                      {k.label}
                    </p>
                    <p className="text-lg text-white/85">{k.value}</p>
                  </div>
                </div>
              );
            })}
          </div>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-white/80">Leitura cruzada</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {analysis.insights.map((ins, i) => (
                <div
                  key={`${ins.title}-${i}`}
                  className={cn(
                    "rounded-xl border p-4",
                    insightTone[ins.tone] ?? insightTone.info
                  )}
                >
                  <p className="text-sm font-medium text-white">{ins.title}</p>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">
                    {ins.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-white/80">Ajustar temas</h2>
            <p className="text-xs text-white/40">
              Clique nos chips para marcar ou desmarcar. Vale para todos os
              anúncios da campanha — use quando o nome for tipo “MEME 1” e o
              tema só estiver óbvio para você.
            </p>
            <div className={panelTableWrap}>
              <table className="min-w-[720px] w-full text-left">
                <thead className={panelTableHead}>
                  <tr>
                    {["Campanha", "Temas"].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...analysis.campaignChampions]
                    .sort((a, b) => {
                      const empty = Number(a.themes.length > 0) - Number(b.themes.length > 0);
                      return empty || a.campaign.localeCompare(b.campaign, "pt-BR");
                    })
                    .map((row) => (
                      <tr
                        key={row.campaign}
                        className="border-t border-white/[0.05] text-white/70"
                      >
                        <td className="max-w-[280px] px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            <span className="truncate text-white/90">
                              {row.campaign}
                            </span>
                            <CopyNameButton name={row.campaign} />
                          </div>
                          {row.themes.length === 0 && (
                            <p className="text-[11px] text-amber-200/80">
                              Sem tema automático
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex flex-wrap gap-1.5">
                            {THEME_KEYS.map((theme) => {
                              const on = row.themes.includes(theme);
                              return (
                                <button
                                  key={theme}
                                  type="button"
                                  onClick={() =>
                                    onToggleCampaignTheme(row.campaign, theme, on)
                                  }
                                  className={cn(
                                    "rounded-full px-2.5 py-1 text-[11px]",
                                    on
                                      ? "bg-sky-500/20 text-sky-100"
                                      : "bg-white/5 text-white/35 hover:text-white/70"
                                  )}
                                >
                                  {THEME_LABELS[theme]}
                                </button>
                              );
                            })}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-white/80">
              Campeões por tema (engajamento com o post)
            </h2>
            <p className="text-xs text-white/40">
              Jair e Flávio ficam separados. O campeão é o criativo com melhor
              ER + volume. Clique no tema da campanha para corrigir um match.
            </p>
            <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
              {analysis.themes.map((theme) => {
                const c = theme.champion;
                return (
                  <div key={theme.theme} className={cn(panelCardPadded, "space-y-2")}>
                    <p className="text-[11px] uppercase tracking-wide text-sky-300/80">
                      {theme.label}
                    </p>
                    {c ? (
                      <>
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-white">
                            {c.ad !== "—" ? c.ad : c.label}
                          </p>
                          <CopyNameButton name={c.ad !== "—" ? c.ad : c.label} />
                        </div>
                        <p className="text-xs text-white/45">
                          {c.campaign}
                          {c.adset !== "—" ? ` · ${c.adset}` : ""}
                        </p>
                        <p className="text-xs text-white/60">
                          ER {pct(c.engagementRate)} · {num(c.engagements)} engaj. ·{" "}
                          {brl(c.spend)} · CPE{" "}
                          {c.costPerEngagement ? brl(c.costPerEngagement) : "—"}
                        </p>
                        <p className="text-[11px] text-white/35">
                          {theme.count} criativos no tema · ER médio do tema{" "}
                          {pct(theme.engagementRate)}
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-white/40">
                        Sem criativo com esse tema no nome.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-medium text-white/80">
              Criativo campeão de cada campanha
            </h2>
            <div className={panelTableWrap}>
              <table className="min-w-[720px] w-full text-left">
                <thead className={panelTableHead}>
                  <tr>
                    {["Campanha", "Criativo campeão", "Temas", "ER", "Engaj.", "CPE"].map(
                      (h) => (
                        <th key={h} className="px-3 py-2.5 font-medium">
                          {h}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {analysis.campaignChampions.map((row) => (
                    <tr
                      key={row.campaign}
                      className="border-t border-white/[0.05] text-white/70"
                    >
                      <td className="max-w-[220px] truncate px-3 py-2.5 text-white/90">
                        {row.campaign}
                      </td>
                      <td className="max-w-[260px] px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="truncate">
                            {row.champion.ad !== "—"
                              ? row.champion.ad
                              : row.champion.label}
                          </span>
                          <CopyNameButton
                            name={
                              row.champion.ad !== "—"
                                ? row.champion.ad
                                : row.champion.label
                            }
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-white/50">
                        {row.themes.length
                          ? row.themes.map((t) => THEME_LABELS[t]).join(" · ")
                          : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-sky-200">
                        {pct(row.champion.engagementRate)}
                      </td>
                      <td className="px-3 py-2.5">
                        {num(row.champion.engagements)}
                      </td>
                      <td className="px-3 py-2.5">
                        {row.champion.costPerEngagement
                          ? brl(row.champion.costPerEngagement)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-sm font-medium text-white/80">
                  Ranking dos melhores criativos
                </h2>
                <p className="mt-1 text-xs text-white/40">
                  Copie o nome e cole na busca do Gerenciador. Algoritmo = ER +
                  volume − CPE. Grok 4.6 (Kie) dá a opinião e o ranking próprio.
                </p>
              </div>
              <button
                type="button"
                disabled={grokBusy}
                onClick={() => void runGrokRanking()}
                className="flex items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-medium text-black disabled:cursor-not-allowed disabled:opacity-40"
              >
                {grokBusy ? <Loader2 className="animate-spin" size={16} /> : null}
                {grok ? "Atualizar ranking Grok 4.6" : "Pedir ranking Grok 4.6"}
              </button>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className={cn(panelCard, "overflow-hidden")}>
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-sky-300/90">
                    Algoritmo
                  </p>
                </div>
                <ol className="divide-y divide-white/[0.04]">
                  {algoRanking.map((row) => (
                    <li
                      key={`${row.rank}-${row.name}`}
                      className="flex items-start gap-3 px-4 py-3"
                    >
                      <span className="mt-0.5 w-6 shrink-0 text-sm text-white/35">
                        {row.rank}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start gap-1">
                          <p className="truncate text-sm text-white">{row.name}</p>
                          <CopyNameButton name={row.name} />
                        </div>
                        <p className="truncate text-[11px] text-white/40">
                          {row.campaign}
                          {row.adset !== "—" ? ` · ${row.adset}` : ""}
                          {row.themes.length ? ` · ${row.themes.join(", ")}` : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/55">
                          ER {pct(row.engagementRate)} · {num(row.engagements)}{" "}
                          engaj. · CPE{" "}
                          {row.costPerEngagement
                            ? brl(row.costPerEngagement)
                            : "—"}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              <div className={cn(panelCard, "overflow-hidden")}>
                <div className="border-b border-white/[0.06] px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wide text-violet-300/90">
                    Grok 4.6
                  </p>
                </div>
                {!grok && !grokBusy && (
                  <p className="px-4 py-8 text-center text-xs text-white/40">
                    Clique em Pedir ranking Grok 4.6 para a opinião e o ranking
                    do modelo.
                  </p>
                )}
                {grokBusy && (
                  <p className="flex items-center justify-center gap-2 px-4 py-8 text-xs text-white/50">
                    <Loader2 className="animate-spin" size={14} />
                    Grok 4.6 analisando os criativos…
                  </p>
                )}
                {grok && !grokBusy && (
                  <div>
                    {grok.opinion && (
                      <p className="whitespace-pre-wrap border-b border-white/[0.04] px-4 py-3 text-xs leading-relaxed text-white/65">
                        {grok.opinion}
                      </p>
                    )}
                    <ol className="divide-y divide-white/[0.04]">
                      {grok.ranking.map((row) => (
                        <li
                          key={`${row.rank}-${row.name}`}
                          className="flex items-start gap-3 px-4 py-3"
                        >
                          <span className="mt-0.5 w-6 shrink-0 text-sm text-white/35">
                            {row.rank}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-1">
                              <p className="truncate text-sm text-white">
                                {row.name}
                              </p>
                              <CopyNameButton name={row.name} />
                            </div>
                            {row.reason && (
                              <p className="mt-0.5 text-[11px] leading-relaxed text-white/50">
                                {row.reason}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </section>

          <div className="flex flex-wrap gap-2">
            {(
              [
                ["campaign", "Campanhas"],
                ["adset", "Conjuntos"],
                ["ad", "Anúncios"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm",
                  tab === id
                    ? "bg-white/10 text-white"
                    : "text-white/45 hover:text-white/80"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <RankingTable level={tab} rows={active.ads} />
        </>
      )}
    </div>
  );
}

function RankingTable({
  level,
  rows,
}: {
  level: AnalysisLevel;
  rows: AnalyzedAd[];
}) {
  const first =
    level === "campaign" ? "Campanha" : level === "adset" ? "Conjunto" : "Anúncio";

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-white/80">
        Ranking · {first.toLowerCase()}
      </h2>
      <div className={panelTableWrap}>
        <table className="min-w-[1280px] w-full text-left">
          <thead className={panelTableHead}>
            <tr>
              {[
                first,
                level === "ad" ? "Conjunto" : "Campanha",
                "Veiculação",
                "Imp.",
                "Alcance",
                "Freq.",
                "Gasto",
                "Orçamento",
                "Engaj. post",
                "ER",
                "CPE",
                "Reações",
                "Coment.",
                "Saves",
                "Shares",
                "Views",
                "50%",
                "75%",
                "ThruPlay",
                "Página",
                "Seg. IG",
                "Status",
              ].map((h) => (
                <th key={h} className="px-3 py-2.5 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const v = verdictLabel[row.verdict];
              const primary =
                level === "campaign"
                  ? row.campaign
                  : level === "adset"
                    ? row.adset
                    : row.ad !== "—"
                      ? row.ad
                      : row.label;
              const secondary =
                level === "ad" ? row.adset : row.campaign;
              return (
                <tr
                  key={`${row.campaign}-${row.adset}-${row.ad}-${i}`}
                  className="border-t border-white/[0.05] text-white/70"
                >
                  <td className="max-w-[200px] px-3 py-2.5 text-white/90">
                    <div className="flex items-center gap-1">
                      <span className="truncate">{primary}</span>
                      <CopyNameButton name={primary} />
                    </div>
                  </td>
                  <td className="max-w-[160px] truncate px-3 py-2.5 text-white/45">
                    {secondary}
                  </td>
                  <td className="max-w-[120px] truncate px-3 py-2.5">
                    {row.delivery}
                  </td>
                  <td className="px-3 py-2.5">{num(row.impressions)}</td>
                  <td className="px-3 py-2.5">{num(row.reach)}</td>
                  <td className="px-3 py-2.5">
                    {row.frequency ? row.frequency.toFixed(2) : "—"}
                  </td>
                  <td className="px-3 py-2.5">{brl(row.spend)}</td>
                  <td className="px-3 py-2.5">
                    {row.budget ? brl(row.budget) : "—"}
                  </td>
                  <td className="px-3 py-2.5">{num(row.engagements)}</td>
                  <td className="px-3 py-2.5 text-sky-200">
                    {pct(row.engagementRate)}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.costPerEngagement ? brl(row.costPerEngagement) : "—"}
                  </td>
                  <td className="px-3 py-2.5">{num(row.reactions)}</td>
                  <td className="px-3 py-2.5">{num(row.comments)}</td>
                  <td className="px-3 py-2.5">{num(row.saves)}</td>
                  <td className="px-3 py-2.5">{num(row.shares)}</td>
                  <td className="px-3 py-2.5">{num(row.views)}</td>
                  <td className="px-3 py-2.5">
                    {row.views ? pct(row.hold50) : "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    {row.views ? pct(row.hold75) : "—"}
                  </td>
                  <td className="px-3 py-2.5">{num(row.thruplay)}</td>
                  <td className="px-3 py-2.5">{num(row.pageEngagement)}</td>
                  <td className="px-3 py-2.5">{num(row.igFollowers)}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px]",
                        v.className
                      )}
                    >
                      {v.text}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
