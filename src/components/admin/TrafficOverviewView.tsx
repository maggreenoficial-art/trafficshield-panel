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
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import {
  panelCardPadded,
  panelInput,
  panelPillBtn,
  panelSectionTitle,
} from "@/lib/panel-styles";

const features = [
  {
    icon: Zap,
    title: "Anti-ratos",
    desc: "Filtra clonadores, bots e revisores antes de chegarem na oferta.",
  },
  {
    icon: Globe,
    title: "Flexível",
    desc: "Funciona na sua infraestrutura Next.js sem servidor extra.",
  },
  {
    icon: ShieldCheck,
    title: "99,9% de passagem",
    desc: "Campanhas legítimas passam; ratos digitais são barrados.",
  },
  {
    icon: Sparkles,
    title: "IA adaptativa",
    desc: "Motor de scoring com sensibilidade ajustável em tempo real.",
  },
  {
    icon: Shield,
    title: "Anti-plágio",
    desc: "Oculta conteúdo sensível de espiões e scrapers.",
  },
  {
    icon: ShieldAlert,
    title: "Campanhas protegidas",
    desc: "Valida tráfego de anúncios e bloqueia acessos inválidos.",
  },
];

export function TrafficOverviewView() {
  const [config, setConfig] = useState<TrafficShieldConfig | null>(null);
  const [stats, setStats] = useState<TrafficShieldStats | null>(null);
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [trafficRes, meRes] = await Promise.all([
      fetch("/api/admin/traffic"),
      fetch("/api/admin/me"),
    ]);
    const json = await trafficRes.json();
    const me = await meRes.json();
    setConfig(json.config ?? null);
    setStats(json.stats ?? null);
    setTenantName(me.tenant?.name ?? json.tenant?.name ?? null);
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
        <Loader2 className="animate-spin text-white/30" size={28} />
      </div>
    );
  }

  if (!config || !stats) {
    return <p className="text-sm text-white/40">Erro ao carregar proteção de tráfego.</p>;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <AdminPageTitle
          title="Início"
          subtitle={
            tenantName
              ? `${tenantName} — visão geral`
              : "Visão geral do seu workspace"
          }
        />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <div className="landing-nav-pill rounded-full p-1">
            <button
              onClick={() => updateConfig({ enabled: !config!.enabled })}
              disabled={saving}
              className={`${panelPillBtn} w-full sm:w-auto ${
                config!.enabled ? "text-white/75" : ""
              }`}
            >
              {config!.enabled ? "Ativo" : "Inativo"}
            </button>
          </div>
          <div className="landing-nav-pill rounded-full p-1">
            <button
              onClick={load}
              disabled={loading}
              className={`${panelPillBtn} flex w-full items-center justify-center gap-1.5 sm:w-auto`}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Atualizar
            </button>
          </div>
        </div>
      </div>

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
        <div className={panelCardPadded}>
          <h2 className={panelSectionTitle}>Tráfego por hora</h2>
          <div className="mt-6 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="hour" tick={{ fill: "#888", fontSize: 12 }} />
                <YAxis tick={{ fill: "#888", fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #333",
                    fontSize: 14,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="allowed"
                  stackId="1"
                  stroke="var(--chart-permitted)"
                  fill="color-mix(in srgb, var(--chart-permitted) 19%, transparent)"
                  name="Permitido"
                />
                <Area
                  type="monotone"
                  dataKey="suspicious"
                  stackId="1"
                  stroke="var(--chart-suspicious)"
                  fill="color-mix(in srgb, var(--chart-suspicious) 19%, transparent)"
                  name="Suspeito"
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  stackId="1"
                  stroke="var(--chart-blocked)"
                  fill="color-mix(in srgb, var(--chart-blocked) 19%, transparent)"
                  name="Bloqueado"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={panelCardPadded}>
          <h2 className={panelSectionTitle}>Motivos de bloqueio</h2>
          <div className="mt-6 h-56">
            {stats.topReasons.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topReasons} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                  <XAxis type="number" tick={{ fill: "#888", fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="reason"
                    width={130}
                    tick={{ fill: "#888", fontSize: 11 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111",
                      border: "1px solid #333",
                      fontSize: 14,
                    }}
                  />
                  <Bar dataKey="count" fill="var(--accent)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="flex h-full items-center justify-center text-sm text-white/40">
                Nenhum bloqueio nas últimas 24h
              </p>
            )}
          </div>
        </div>
      </div>

      <div className={panelCardPadded}>
        <h2 className={panelSectionTitle}>Configuração</h2>
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
            <label className="mb-2 block text-sm text-white/40">
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
            <p className="mt-1 text-sm text-white/35">
              Ajusta o scoring adaptativo de detecção
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/40">
              Página segura (anti-plágio)
            </label>
            <input
              type="text"
              value={config.safePagePath}
              onChange={(e) =>
                updateConfig({ safePagePath: e.target.value })
              }
              className={panelInput}
            />
          </div>
        </div>

        <div className="landing-nav-pill mt-6 inline-flex flex-wrap gap-0.5 rounded-full p-1">
          {(["monitor", "protect", "strict"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => updateConfig({ mode })}
              className={`${panelPillBtn} px-3 py-1.5 text-sm ${
                config.mode === mode ? "bg-white/[0.06] text-white/75" : ""
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
            <div key={f.title} className={panelCardPadded}>
              <Icon size={16} className="text-white/30" strokeWidth={1.5} />
              <h3 className="mt-3 text-base font-medium text-white/75">{f.title}</h3>
              <p className="mt-1.5 text-sm text-white/45 sm:text-[15px]">{f.desc}</p>
            </div>
          );
        })}
      </div>

      <div className={panelCardPadded}>
        <h2 className={panelSectionTitle}>Logs recentes</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-white/40">
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
                  <td colSpan={6} className="py-8 text-center text-white/40">
                    Nenhum log ainda. O shield começará a registrar após a
                    primeira visita.
                  </td>
                </tr>
              ) : (
                stats.recentLogs.map((log) => (
                  <tr key={log.id} className="border-b border-white/[0.04]">
                    <td className="py-3 pr-4 text-white/40">
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
                    <td className="py-3 text-white/40">
                      {log.reasons.slice(0, 2).join(", ")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
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
  void accent;
  return (
    <div className={panelCardPadded}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/40">{label}</p>
        <Icon size={15} className="text-white/30" strokeWidth={1.5} />
      </div>
      <p className="mt-3 text-2xl font-medium text-white/85">{value}</p>
      <p className="mt-1 text-sm text-white/35">{sub}</p>
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
        <p className="text-sm font-medium text-white/75">{label}</p>
        <p className="text-sm text-white/40">{desc}</p>
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
      className={`rounded px-2 py-0.5 text-xs ${styles[action] ?? "text-muted"}`}
    >
      {labels[action] ?? action}
    </span>
  );
}
