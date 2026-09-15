"use client";

import { useMemo, useRef, useState } from "react";
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

  async function onSlotFile(slot: Slot, list: FileList | null) {
    const file = list?.[0];
    if (!file) return;
    setError("");
    try {
      const { rows } = parseAdsManagerExport(await file.text());
      if (!rows.length) throw new Error(`${SLOTS.find((s) => s.id === slot)?.title}: arquivo sem linhas.`);
      setFiles((prev) => ({ ...prev, [slot]: { name: file.name, rows } }));
      setAnalysis(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    } finally {
      const el = inputRefs[slot].current;
      if (el) el.value = "";
    }
  }

  function runAnalysis() {
    if (!files.campaign || !files.adset || !files.ad) {
      setError("Envie os 3 CSVs: Campanhas, Conjuntos e Anúncios.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      setAnalysis(
        analyzeTriple(files.campaign.rows, files.adset.rows, files.ad.rows)
      );
      setTab("ad");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha na análise.");
    } finally {
      setBusy(false);
    }
  }

  const active: EngagementAnalysis | null = analysis ? analysis[tab] : null;

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
        title="Análise de campanha"
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
                  <td className="max-w-[200px] truncate px-3 py-2.5 text-white/90">
                    {primary}
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
