"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Bot, Shield, TrendingUp } from "lucide-react";
import type { CampaignStats } from "@/lib/traffic-shield/campaign-types";

interface CampaignChartsPanelProps {
  stats: CampaignStats | null;
  fallbackOffer?: number;
  fallbackSafe?: number;
  fallbackBots?: number;
}

export function CampaignChartsPanel({
  stats,
  fallbackOffer = 0,
  fallbackSafe = 0,
  fallbackBots = 0,
}: CampaignChartsPanelProps) {
  const clicksOffer = stats?.clicksOffer ?? fallbackOffer;
  const clicksSafe = stats?.clicksSafe ?? fallbackSafe;
  const clicksBots = stats?.clicksBots ?? fallbackBots;
  const totalRequests =
    stats?.totalRequests ?? clicksOffer + clicksSafe;

  return (
    <div className="space-y-6">
      <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-4 text-[10px] leading-relaxed text-muted">
        <strong className="text-yellow-400">Sem teste de redirecionamento:</strong>{" "}
        se você acessar a própria URL, cairá na{" "}
        <strong className="text-white">página segura</strong> — o acesso não vem do
        anúncio de forma nativa. Para confirmar que clientes chegam à oferta,
        acompanhe o gráfico abaixo em tempo real.
      </div>

      <div>
        <p className="text-[10px] tracking-widest text-muted uppercase">
          Passo 13 — Requisições em tempo real
        </p>
        <p className="mt-1 text-xs text-muted">
          Os cliques dos seus clientes devem aparecer em{" "}
          <strong className="text-accent">Página de oferta</strong>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ChartStatCard
          icon={Activity}
          label="Total de requisições"
          value={formatCount(totalRequests)}
          desc="Acessos reais processados"
        />
        <ChartStatCard
          icon={TrendingUp}
          label="Página de oferta"
          value={formatCount(clicksOffer)}
          desc="Acessos qualificados"
          accent
        />
        <ChartStatCard
          icon={Shield}
          label="Página segura"
          value={formatCount(clicksSafe)}
          desc="Acessos indesejados"
          color="text-green-400"
        />
        <ChartStatCard
          icon={Bot}
          label="Bots"
          value={formatCount(clicksBots)}
          desc="Contabilizados à parte"
          color="text-orange-400"
        />
      </div>

      {stats && stats.hourly.length > 0 ? (
        <div>
          <p className="mb-3 text-[10px] tracking-widest text-muted uppercase">
            Gráfico — últimas 24h
          </p>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.hourly}>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                <XAxis dataKey="hour" tick={{ fill: "#888", fontSize: 9 }} />
                <YAxis tick={{ fill: "#888", fontSize: 9 }} />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #333",
                    fontSize: 11,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="offer"
                  stroke="#d4a0a8"
                  fill="#d4a0a830"
                  name="Oferta"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="safe"
                  stroke="#4ade80"
                  fill="#4ade8030"
                  name="Segura"
                  stackId="1"
                />
                <Area
                  type="monotone"
                  dataKey="bots"
                  stroke="#fb923c"
                  fill="#fb923c30"
                  name="Bots"
                  stackId="2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded border border-white/10 py-12 text-center text-xs text-muted">
          Aguardando primeiras requisições da campanha ativa...
          <br />
          Publique o anúncio com a URL gerada e volte aqui para acompanhar.
        </div>
      )}
    </div>
  );
}

function ChartStatCard({
  icon: Icon,
  label,
  value,
  desc,
  accent,
  color,
}: {
  icon: typeof Activity;
  label: string;
  value: string;
  desc: string;
  accent?: boolean;
  color?: string;
}) {
  return (
    <div className="border border-white/10 p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon size={14} className={color ?? (accent ? "text-accent" : "")} />
        <p className="text-[10px] uppercase tracking-wider">{label}</p>
      </div>
      <p
        className={`mt-2 text-2xl font-medium ${color ?? (accent ? "text-accent" : "text-white")}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] text-muted">{desc}</p>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}
