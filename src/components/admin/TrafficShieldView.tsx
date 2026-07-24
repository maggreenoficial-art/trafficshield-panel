"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Bot,
  CheckCircle2,
  Globe,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import type {
  TrafficShieldConfig,
  TrafficShieldStats,
} from "@/lib/traffic-shield/types";
import { CampaignManager } from "@/components/admin/CampaignManager";
import { DomainManager } from "@/components/admin/DomainManager";
import {
  AdminPageTitle,
  AdminScrollTabs,
} from "@/components/admin/AdminMobileUI";

const features = [
  {
    icon: Zap,
    title: "Plug and Play",
    desc: "Ative em um clique. Sem instalar nada na hospedagem.",
  },
  {
    icon: Globe,
    title: "Flexível",
    desc: "Funciona na sua infraestrutura Next.js sem servidor extra.",
  },
  {
    icon: ShieldCheck,
    title: "99,9% de passagem",
    desc: "Campanhas legítimas passam; bots e scrapers são filtrados.",
  },
  {
    icon: Sparkles,
    title: "IA adaptativa",
    desc: "Motor de scoring com sensibilidade ajustável em tempo real.",
  },
  {
    icon: Shield,
    title: "Anti-plágio",
    desc: "Oculta conteúdo sensível de concorrentes e scrapers.",
  },
  {
    icon: ShieldAlert,
    title: "Campanhas protegidas",
    desc: "Valida tráfego de anúncios e bloqueia acessos inválidos.",
  },
];

export function TrafficShieldView() {
  const [tab, setTab] = useState<"overview" | "campaigns" | "domains">("overview");
  const [config, setConfig] = useState<TrafficShieldConfig | null>(null);
  const [stats, setStats] = useState<TrafficShieldStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/traffic");
    const json = await res.json();
    setConfig(json.config ?? null);
    setStats(json.stats ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const updateConfig = async (patch: Partial<TrafficShieldConfig>) => {
    if (!config) return;
    setSaving(true);
    const res = await fetch("/api/admin/traffic", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = await res.json();
    if (json.config) setConfig(json.config);
    setSaving(false);
    await load();
  };

  if (loading && !config) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!config || !stats) {
    return <p className="text-muted">Erro ao carregar proteção de tráfego.</p>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <Shield className="shrink-0 text-accent" size={24} />
            <AdminPageTitle
              title="Traffic Shield"
              subtitle="Filtre bots e acessos indesejados antes das campanhas"
            />
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {tab === "overview" && (
            <>
              <button
                onClick={() => updateConfig({ enabled: !config!.enabled })}
                disabled={saving}
                className={`w-full rounded-full px-5 py-2.5 text-xs font-semibold tracking-widest uppercase transition-colors sm:w-auto ${
                  config!.enabled
                    ? "border border-green-500/30 bg-green-500/20 text-green-400"
                    : "border border-white/20 bg-white/10 text-muted"
                }`}
              >
                {config!.enabled ? "Ativo" : "Inativo"}
              </button>
              <button
                onClick={load}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-white/20 px-4 py-2.5 text-xs tracking-widest uppercase hover:border-accent sm:w-auto"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
                Atualizar
              </button>
            </>
          )}
        </div>
      </div>

      <AdminScrollTabs>
        {([
          { id: "overview" as const, label: "Visão Geral" },
          { id: "campaigns" as const, label: "Campanhas" },
          { id: "domains" as const, label: "Domínios" },
        ]).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`shrink-0 px-4 py-3 text-xs tracking-widest uppercase transition-colors ${
              tab === t.id
                ? "border-b-2 border-accent text-accent"
                : "text-muted hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </AdminScrollTabs>

      {tab === "campaigns" ? (
        <CampaignManager />
      ) : tab === "domains" ? (
        <DomainManager />
      ) : (
        <>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Passagem (24h)"
          value={`${stats.passRate}%`}
          sub="Tráfego legítimo"
          icon={CheckCircle2}
          accent
        />
        <StatCard
          label="Requisições (24h)"
          value={String(stats.total24h)}
          sub={`${stats.allowed24h} permitidas`}
          icon={Globe}
        />
        <StatCard
          label="Bloqueados (24h)"
          value={String(stats.blocked24h)}
          sub={`${stats.botsBlocked24h} bots/scrapers`}
          icon={Bot}
        />
        <StatCard
          label="Suspeitos (24h)"
          value={String(stats.suspicious24h)}
          sub="Monitorados"
          icon={ShieldAlert}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 p-6">
          <h2 className="text-xs font-bold tracking-[0.2em]">TRÁFEGO POR HORA</h2>
          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="hour" tick={{ fill: "#888", fontSize: 10 }} />
                <YAxis tick={{ fill: "#888", fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #333",
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="allowed"
                  stackId="1"
                  stroke="#d4a0a8"
                  fill="#d4a0a830"
                  name="Permitido"
                />
                <Area
                  type="monotone"
                  dataKey="suspicious"
                  stackId="1"
                  stroke="#fbbf24"
                  fill="#fbbf2430"
                  name="Suspeito"
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  stackId="1"
                  stroke="#f87171"
                  fill="#f8717130"
                  name="Bloqueado"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="border border-white/10 p-6">
          <h2 className="text-xs font-bold tracking-[0.2em]">
            MOTIVOS DE BLOQUEIO
          </h2>
          <div className="mt-6 h-56">
            {stats.topReasons.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topReasons} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis type="number" tick={{ fill: "#888", fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    width={120}
                    tick={{ fill: "#888", fontSize: 9 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #333",
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="count" fill="#d4a0a8" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-muted">
                Nenhum bloqueio nas últimas 24h
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="border border-white/10 p-6">
        <h2 className="text-xs font-bold tracking-[0.2em]">CONFIGURAÇÃO</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle
            label="Modo proteção"
            desc="Filtra tráfego inválido ativamente"
            checked={config.mode === "protect" || config.mode === "strict"}
            onChange={(v) =>
              updateConfig({ mode: v ? "protect" : "monitor" })
            }
          />
          <Toggle
            label="Bloquear bots"
            desc="User-agents de automação"
            checked={config.blockBots}
            onChange={(v) => updateConfig({ blockBots: v })}
          />
          <Toggle
            label="Bloquear scrapers"
            desc="Ferramentas de coleta de dados"
            checked={config.blockScrapers}
            onChange={(v) => updateConfig({ blockScrapers: v })}
          />
          <Toggle
            label="Bloquear headless"
            desc="Puppeteer, Playwright, Selenium"
            checked={config.blockHeadless}
            onChange={(v) => updateConfig({ blockHeadless: v })}
          />
          <Toggle
            label="Proteger campanhas"
            desc="Valida tráfego de anúncios"
            checked={config.protectCampaigns}
            onChange={(v) => updateConfig({ protectCampaigns: v })}
          />
          <Toggle
            label="Anti-plágio"
            desc="Redireciona bots para página segura"
            checked={config.hidePricingFromBots}
            onChange={(v) => updateConfig({ hidePricingFromBots: v })}
          />
          <Toggle
            label="Motores de busca"
            desc="Permite Google, Bing, etc."
            checked={config.allowSearchEngines}
            onChange={(v) => updateConfig({ allowSearchEngines: v })}
          />
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-[10px] tracking-widest text-muted uppercase">
              Sensibilidade IA ({Math.round(config.mlSensitivity * 100)}%)
            </label>
            <input
              type="range"
              min={0.3}
              max={1}
              step={0.05}
              value={config.mlSensitivity}
              onChange={(e) =>
                updateConfig({ mlSensitivity: Number(e.target.value) })
              }
              className="w-full accent-accent"
            />
            <p className="mt-1 text-[10px] text-muted">
              Ajusta o scoring adaptativo de detecção
            </p>
          </div>
          <div>
            <label className="mb-2 block text-[10px] tracking-widest text-muted uppercase">
              Página segura (anti-plágio)
            </label>
            <input
              type="text"
              value={config.safePagePath}
              onChange={(e) =>
                updateConfig({ safePagePath: e.target.value })
              }
              className="w-full border-b border-white/20 bg-transparent py-2 text-sm outline-none focus:border-accent"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {(["monitor", "protect", "strict"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateConfig({ mode })}
              className={`rounded-full px-4 py-1.5 text-[10px] tracking-widest uppercase ${
                config.mode === mode
                  ? "bg-accent/20 text-accent border border-accent/40"
                  : "border border-white/10 text-muted hover:border-white/30"
              }`}
            >
              {mode === "monitor"
                ? "Monitorar"
                : mode === "protect"
                  ? "Proteger"
                  : "Estrito"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.title}
              className="border border-white/10 p-5 transition-colors hover:border-accent/30"
            >
              <Icon size={20} className="text-accent" />
              <h3 className="mt-3 text-sm font-medium">{f.title}</h3>
              <p className="mt-1 text-xs text-muted">{f.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="border border-white/10 p-6">
        <h2 className="text-xs font-bold tracking-[0.2em]">
          LOGS RECENTES
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 text-muted">
                <th className="py-3 pr-4">Hora</th>
                <th className="py-3 pr-4">Ação</th>
                <th className="py-3 pr-4">Score</th>
                <th className="py-3 pr-4">Path</th>
                <th className="py-3 pr-4">Categoria</th>
                <th className="py-3">Motivos</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted">
                    Nenhum log ainda. O shield começará a registrar após a
                    primeira visita.
                  </td>
                </tr>
              ) : (
                stats.recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-muted">
                      {new Date(log.createdAt).toLocaleTimeString("pt-BR")}
                    </td>
                    <td className="py-3 pr-4">
                      <ActionBadge action={log.action} />
                    </td>
                    <td className="py-3 pr-4">{log.score}</td>
                    <td className="py-3 pr-4 max-w-[120px] truncate">
                      {log.path}
                    </td>
                    <td className="py-3 pr-4 capitalize">{log.category}</td>
                    <td className="py-3 text-muted">
                      {log.reasons.slice(0, 2).join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  icon: typeof Shield;
  accent?: boolean;
}) {
  return (
    <div className="border border-white/10 p-5">
      <div className="flex items-center justify-between">
        <p className="text-[10px] tracking-widest text-muted uppercase">
          {label}
        </p>
        <Icon size={16} className={accent ? "text-accent" : "text-muted"} />
      </div>
      <p
        className={`mt-3 text-2xl font-medium ${accent ? "text-accent" : ""}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] text-muted">{sub}</p>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 accent-accent"
      />
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-[10px] text-muted">{desc}</p>
      </div>
    </label>
  );
}

function ActionBadge({ action }: { action: string }) {
  const styles: Record<string, string> = {
    allow: "text-green-400 bg-green-500/10",
    suspicious: "text-yellow-400 bg-yellow-500/10",
    block: "text-red-400 bg-red-500/10",
    safe_page: "text-orange-400 bg-orange-500/10",
  };
  const labels: Record<string, string> = {
    allow: "Permitido",
    suspicious: "Suspeito",
    block: "Bloqueado",
    safe_page: "Página segura",
  };
  return (
    <span
      className={`rounded px-2 py-0.5 text-[10px] ${styles[action] ?? "text-muted"}`}
    >
      {labels[action] ?? action}
    </span>
  );
}
