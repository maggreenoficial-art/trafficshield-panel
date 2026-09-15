"use client";

import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
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
import { parseAdsManagerExport } from "@/lib/ads-analysis/parse-ads-export";
import {
  analyzeEngagement,
  type AnalyzedAd,
  type EngagementAnalysis,
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

export function CampaignAnalysisView() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [analysis, setAnalysis] = useState<EngagementAnalysis | null>(null);

  async function onFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const text = await file.text();
      const { rows } = parseAdsManagerExport(text);
      if (!rows.length) {
        throw new Error("O arquivo foi lido, mas não há linhas de anúncio.");
      }
      setFileName(file.name);
      setAnalysis(analyzeEngagement(rows));
    } catch (e) {
      setAnalysis(null);
      setError(e instanceof Error ? e.message : "Falha ao ler o arquivo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const kpis = useMemo(() => {
    if (!analysis) return [];
    const t = analysis.totals;
    return [
      { label: "Anúncios", value: String(t.ads), icon: BarChart3 },
      { label: "Impressões", value: num(t.impressions), icon: Sparkles },
      { label: "Gasto", value: brl(t.spend), icon: FileSpreadsheet },
      { label: "Engajamentos", value: num(t.engagements), icon: ThumbsUp },
      { label: "ER médio", value: pct(t.engagementRate), icon: MessageCircle },
      {
        label: "Custo / engaj.",
        value: t.costPerEngagement ? brl(t.costPerEngagement) : "—",
        icon: Share2,
      },
    ];
  }, [analysis]);

  return (
    <div className="space-y-6 sm:space-y-8">
      <AdminPageTitle
        title="Análise de campanha"
        subtitle="Importe o CSV do Gerenciador de Anúncios e veja quais posts realmente engajam."
      />

      <section className={cn(panelCard, "space-y-4 p-5")}>
        <p className="text-xs leading-relaxed text-white/45">
          No Meta Ads: Relatórios → colunas de{" "}
          <strong className="text-white/70">Engajamento com a publicação</strong>{" "}
          (reações, comentários, shares, saves, visualizações 3s, ThruPlay,
          impressões, valor usado) → Exportar CSV. Cole o arquivo aqui.
        </p>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv,text/plain"
          className="hidden"
          onChange={(e) => void onFiles(e.target.files)}
        />
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-sm text-white/55 transition hover:border-sky-500/40 hover:bg-sky-500/5 hover:text-white/80 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="animate-spin text-sky-300" size={22} />
          ) : (
            <Upload size={22} className="text-white/35" />
          )}
          {busy ? "Analisando..." : "Enviar CSV do Gerenciador"}
          <span className="text-[11px] text-white/30">
            Foco: engajamento com o post — não conversão de checkout
          </span>
        </button>
        {fileName && (
          <p className="text-xs text-white/40">Arquivo: {fileName}</p>
        )}
        {error && <p className="text-sm text-red-300">{error}</p>}
      </section>

      {analysis && (
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
            <h2 className="text-sm font-medium text-white/80">Leitura do tráfego</h2>
            <div className="grid gap-3 lg:grid-cols-2">
              {analysis.insights.map((ins) => (
                <div
                  key={ins.title}
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
            <h2 className="text-sm font-medium text-white/80">
              Ranking por taxa de engajamento
            </h2>
            <div className={panelTableWrap}>
              <table className="min-w-[960px] w-full text-left">
                <thead className={panelTableHead}>
                  <tr>
                    {[
                      "Anúncio",
                      "Campanha",
                      "Imp.",
                      "Gasto",
                      "Engaj.",
                      "ER",
                      "CPE",
                      "Coment.",
                      "Shares",
                      "Hook 3s",
                      "Status",
                    ].map((h) => (
                      <th key={h} className="px-3 py-2.5 font-medium">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analysis.ads.map((ad) => {
                    const v = verdictLabel[ad.verdict];
                    return (
                      <tr
                        key={`${ad.campaign}-${ad.adset}-${ad.ad}`}
                        className="border-t border-white/[0.05] text-white/70"
                      >
                        <td className="max-w-[220px] truncate px-3 py-2.5 text-white/90">
                          {ad.ad}
                        </td>
                        <td className="max-w-[180px] truncate px-3 py-2.5 text-white/45">
                          {ad.campaign}
                        </td>
                        <td className="px-3 py-2.5">{num(ad.impressions)}</td>
                        <td className="px-3 py-2.5">{brl(ad.spend)}</td>
                        <td className="px-3 py-2.5">{num(ad.engagements)}</td>
                        <td className="px-3 py-2.5 text-sky-200">
                          {pct(ad.engagementRate)}
                        </td>
                        <td className="px-3 py-2.5">
                          {ad.costPerEngagement ? brl(ad.costPerEngagement) : "—"}
                        </td>
                        <td className="px-3 py-2.5">{num(ad.comments)}</td>
                        <td className="px-3 py-2.5">{num(ad.shares)}</td>
                        <td className="px-3 py-2.5">
                          {ad.video3s ? pct(ad.hookRate) : "—"}
                        </td>
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
        </>
      )}
    </div>
  );
}
