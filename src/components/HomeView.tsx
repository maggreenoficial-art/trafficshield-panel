"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Globe,
  Loader2,
  RefreshCw,
  Shield,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import type {
  TrafficShieldConfig,
  TrafficShieldStats,
} from "@/lib/traffic-shield/types";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";

export function HomeView() {
  const [config, setConfig] = useState<TrafficShieldConfig | null>(null);
  const [stats, setStats] = useState<TrafficShieldStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/traffic", { credentials: "same-origin" });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "Não foi possível carregar os dados.");
        return;
      }
      setConfig(json.config);
      setStats(json.stats);
    } catch {
      setError("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading && !stats) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-muted">{error}</p>
        <button
          onClick={load}
          className="rounded-full border border-white/20 px-5 py-2.5 text-xs tracking-widest uppercase hover:border-accent"
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const enabled = config?.enabled ?? false;
  const mode = config?.mode ?? "protect";

  return (
    <div className="space-y-8">
      <AdminPageTitle
        title="Início"
        subtitle="Visão geral — caçando ratos nas suas campanhas"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={enabled ? ShieldCheck : ShieldAlert}
          label="Status"
          value={enabled ? "Ativo" : "Desativado"}
          hint={mode === "protect" ? "Modo proteção" : "Modo monitoramento"}
        />
        <StatCard
          icon={Globe}
          label="Requisições 24h"
          value={String(stats?.total24h ?? 0)}
          hint="Total analisado"
        />
        <StatCard
          icon={Shield}
          label="Permitidos"
          value={String(stats?.allowed24h ?? 0)}
          hint="Tráfego humano"
        />
        <StatCard
          icon={Bot}
          label="Bloqueados"
          value={String(stats?.blocked24h ?? 0)}
          hint="Bots e suspeitos"
        />
      </div>

      <div className="rounded-xl border border-white/10 p-6">
        <h2 className="text-sm font-semibold tracking-wide uppercase text-muted">
          Próximos passos
        </h2>
        <ul className="mt-4 space-y-3 text-sm text-white/80">
          <li>1. Configure domínios CNAME para isolar campanhas</li>
          <li>2. Crie campanhas com URL de oferta e página segura</li>
          <li>3. Instale o middleware norat no site do cliente</li>
        </ul>
        <Link
          href="/trafego"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-semibold text-black hover:bg-accent-hover"
        >
          <Shield size={16} />
          Abrir proteção
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 p-5">
      <div className="flex items-center gap-2 text-muted">
        <Icon size={16} className="text-accent" />
        <span className="text-xs tracking-widest uppercase">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold">{value}</p>
      <p className="mt-1 text-xs text-muted">{hint}</p>
    </div>
  );
}
