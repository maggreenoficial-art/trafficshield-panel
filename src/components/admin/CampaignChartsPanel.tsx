"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  Bot,
  Check,
  Copy,
  ShoppingBag,
  Shield,
  TrendingUp,
  Wallet,
} from "lucide-react";
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
  const purchases = stats?.purchases ?? 0;
  const orderBumps = stats?.orderBumps ?? 0;
  const revenue = stats?.revenue ?? 0;
  const cvr = stats?.cvr ?? 0;
  const [copied, setCopied] = useState(false);

  const copyPostback = async () => {
    if (!stats?.postbackBaseUrl) return;
    await navigator.clipboard.writeText(stats.postbackBaseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-4 text-sm leading-relaxed text-muted">
        <strong className="text-yellow-400">Sem teste de redirecionamento:</strong>{" "}
        se você acessar a própria URL, cairá na{" "}
        <strong className="text-white">página segura</strong> — o acesso não vem do
        anúncio de forma nativa. Para confirmar que clientes chegam à oferta,
        acompanhe o gráfico abaixo em tempo real.
      </div>

      <div>
        <p className="text-sm text-white/40">Requisições — últimas 24h</p>
        <p className="mt-1 text-sm text-muted">
          Cliques qualificados aparecem em{" "}
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
          color="text-accent"
        />
      </div>

      <div>
        <p className="text-sm text-white/40">Vendas via postback — 24h</p>
        <p className="mt-1 text-sm text-muted">
          Dispare o postback na thank-you page / webhook do checkout.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ChartStatCard
          icon={ShoppingBag}
          label="Compras"
          value={formatCount(purchases)}
          desc={`CVR ${cvr}% sobre oferta`}
          accent
        />
        <ChartStatCard
          icon={TrendingUp}
          label="Order bumps"
          value={formatCount(orderBumps)}
          desc="Upsells registrados"
        />
        <ChartStatCard
          icon={Wallet}
          label="Receita"
          value={formatMoney(revenue)}
          desc={`AOV ${formatMoney(stats?.aov ?? 0)}`}
          color="text-green-400"
        />
        <ChartStatCard
          icon={Activity}
          label="CVR"
          value={`${cvr}%`}
          desc="Compras / cliques oferta"
        />
      </div>

      {stats?.postbackBaseUrl && (
        <div className="rounded border border-white/[0.06] bg-white/[0.02] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-white/40">URL de postback (compra)</p>
            <button
              type="button"
              onClick={() => void copyPostback()}
              className="flex items-center gap-1 text-sm text-muted hover:text-white"
            >
              {copied ? (
                <Check size={12} className="text-green-400" />
              ) : (
                <Copy size={12} />
              )}
              {copied ? "Copiado" : "Copiar"}
            </button>
          </div>
          <p className="break-all font-mono text-xs text-accent">
            {stats.postbackBaseUrl}
          </p>
          <p className="text-sm text-muted leading-relaxed">
            Troque <code className="text-accent">VALUE</code> e{" "}
            <code className="text-accent">ORDER_ID</code> pelos valores reais.
            Para order bump, use{" "}
            <code className="text-accent">event=order_bump</code>. Aceita GET ou
            POST JSON.
          </p>
        </div>
      )}

      {stats && stats.recentConversions.length > 0 && (
        <div className="overflow-x-auto rounded border border-white/[0.06]">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead className="border-b border-white/[0.06] text-white/40">
              <tr>
                <th className="px-3 py-2">Quando</th>
                <th className="px-3 py-2">Evento</th>
                <th className="px-3 py-2">Valor</th>
                <th className="px-3 py-2">Pedido</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentConversions.map((c) => (
                <tr key={c.id} className="border-b border-white/[0.04]">
                  <td className="px-3 py-2 text-white/50">
                    {new Date(c.createdAt).toLocaleString("pt-BR")}
                  </td>
                  <td className="px-3 py-2 text-white/75">
                    {c.event === "order_bump" ? "Order bump" : "Compra"}
                  </td>
                  <td className="px-3 py-2 text-accent">
                    {formatMoney(c.value)} {c.currency}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs text-white/45">
                    {c.orderId ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {stats && stats.hourly.length > 0 ? (
        <div>
          <p className="mb-3 text-sm text-white/40">Gráfico — últimas 24h</p>
          <div className="h-52">
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
                  dataKey="offer"
                  stroke="var(--chart-permitted)"
                  fill="color-mix(in srgb, var(--chart-permitted) 19%, transparent)"
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
                  stroke="var(--accent)"
                  fill="color-mix(in srgb, var(--accent) 19%, transparent)"
                  name="Bots"
                  stackId="2"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded border border-white/[0.06] py-12 text-center text-sm text-muted">
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
    <div className="border border-white/[0.06] p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon size={14} className={color ?? (accent ? "text-accent" : "")} />
        <p className="text-sm uppercase tracking-wider">{label}</p>
      </div>
      <p
        className={`mt-2 text-2xl font-medium ${color ?? (accent ? "text-accent" : "text-white")}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-muted">{desc}</p>
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function formatMoney(n: number): string {
  return n.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
}
