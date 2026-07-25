"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Calendar,
  CreditCard,
  Loader2,
  Mail,
  RefreshCw,
  Shield,
  User,
} from "lucide-react";
import { AdminPageTitle } from "@/components/admin/AdminMobileUI";
import {
  panelCardPadded,
  panelPillBtn,
  panelSectionTitle,
} from "@/lib/panel-styles";
import {
  MEMBER_ROLE_LABELS,
  PLAN_CLICKS,
  PLAN_LABELS,
  PLAN_PRICES,
  TENANT_STATUS_LABELS,
} from "@/lib/tenant/plan-labels";
import {
  formatBillingInterval,
  formatPanelDate,
  getSubscriptionProgress,
  getSubscriptionWindow,
} from "@/lib/tenant/subscription";
import type { Tenant, TenantMemberRole } from "@/lib/tenant/types";
import { cn } from "@/lib/utils";

type MeResponse = {
  email: string;
  memberRole: TenantMemberRole;
  isPlatformAdmin: boolean;
  tenant: Tenant;
  slots: { used: number; limit: number };
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-white/[0.04] py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-white/40">{label}</span>
      <span className="text-sm text-white/75">{value}</span>
    </div>
  );
}

export function ProfilePageView() {
  const [data, setData] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/me");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erro ao carregar perfil.");
      setData(json as MeResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar perfil.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-white/30" />
      </div>
    );
  }

  if (error || !data?.tenant) {
    return (
      <div className="space-y-4">
        <AdminPageTitle title="Conta" subtitle="Dados do cliente e assinatura" />
        <div className={panelCardPadded}>
          <p className="text-sm text-red-400/90">{error ?? "Perfil indisponível."}</p>
          <button type="button" onClick={() => void load()} className={`${panelPillBtn} mt-4`}>
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const { tenant, email, memberRole, isPlatformAdmin, slots } = data;
  const subscription = getSubscriptionProgress({
    startsAt: tenant.subscriptionStartsAt ?? tenant.createdAt,
    endsAt: tenant.subscriptionEndsAt,
    createdAt: tenant.createdAt,
  });
  const { startsAt, endsAt } = getSubscriptionWindow({
    startsAt: tenant.subscriptionStartsAt ?? tenant.createdAt,
    endsAt: tenant.subscriptionEndsAt,
    createdAt: tenant.createdAt,
  });

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <AdminPageTitle
          title="Conta"
          subtitle="Dados do cliente, plano e tempo de assinatura"
        />
        <button
          type="button"
          onClick={() => void load()}
          className={`${panelPillBtn} inline-flex items-center gap-1.5`}
        >
          <RefreshCw size={14} />
          Atualizar
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className={panelCardPadded}>
          <div className="mb-4 flex items-center gap-2">
            <User size={16} className="text-white/35" />
            <h2 className={panelSectionTitle}>Dados da conta</h2>
          </div>
          <InfoRow label="E-mail" value={email} />
          <InfoRow
            label="Papel no workspace"
            value={MEMBER_ROLE_LABELS[memberRole]}
          />
          <InfoRow
            label="Tipo de acesso"
            value={isPlatformAdmin ? "Administrador da plataforma" : "Cliente"}
          />
          <InfoRow label="Workspace" value={tenant.name} />
          <InfoRow label="ID do workspace" value={tenant.slug} />
        </section>

        <section className={panelCardPadded}>
          <div className="mb-4 flex items-center gap-2">
            <CreditCard size={16} className="text-white/35" />
            <h2 className={panelSectionTitle}>Plano e assinatura</h2>
          </div>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
              {PLAN_LABELS[tenant.plan]}
            </span>
            <span
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                tenant.status === "active"
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
                  : "border-white/10 bg-white/[0.03] text-white/50"
              )}
            >
              {TENANT_STATUS_LABELS[tenant.status]}
            </span>
          </div>

          <InfoRow label="Valor" value={PLAN_PRICES[tenant.plan]} />
          <InfoRow label="Ciclo" value={formatBillingInterval(tenant.billingInterval)} />
          <InfoRow label="Cliques incluídos" value={PLAN_CLICKS[tenant.plan]} />
          <InfoRow label="Domínios" value={`${slots.used} de ${slots.limit} em uso`} />
        </section>
      </div>

      <section className={panelCardPadded}>
        <div className="mb-4 flex items-center gap-2">
          <Calendar size={16} className="text-white/35" />
          <h2 className={panelSectionTitle}>Tempo de assinatura</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs tracking-[0.15em] text-white/35 uppercase">
              Início
            </p>
            <p className="mt-1 text-sm text-white/80">{formatPanelDate(startsAt.toISOString())}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs tracking-[0.15em] text-white/35 uppercase">
              Renovação
            </p>
            <p className="mt-1 text-sm text-white/80">{formatPanelDate(endsAt.toISOString())}</p>
          </div>
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-xs tracking-[0.15em] text-white/35 uppercase">
              Tempo restante
            </p>
            <p
              className={cn(
                "mt-1 text-sm font-medium",
                subscription.isExpired ? "text-red-400" : "text-accent"
              )}
            >
              {subscription.isExpired
                ? "Assinatura expirada"
                : `${subscription.daysRemaining} dia${subscription.daysRemaining === 1 ? "" : "s"}`}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-sm text-white/40">
            <span>
              {subscription.daysElapsed} de {subscription.daysTotal} dias do período
            </span>
            <span>{subscription.percentElapsed}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                subscription.isExpired ? "bg-red-500/70" : "bg-accent"
              )}
              style={{ width: `${subscription.percentElapsed}%` }}
            />
          </div>
        </div>

        <p className="mt-4 flex items-start gap-2 text-sm leading-relaxed text-white/40">
          <Shield size={14} className="mt-0.5 shrink-0" />
          Cliente desde {formatPanelDate(tenant.createdAt)}. Para alterar plano ou renovar
          antecipadamente, fale com o suporte norat.
        </p>
      </section>

      <section className={panelCardPadded}>
        <div className="mb-3 flex items-center gap-2">
          <Mail size={16} className="text-white/35" />
          <h2 className={panelSectionTitle}>Contato</h2>
        </div>
        <p className="text-sm leading-relaxed text-white/55">
          Dúvidas sobre fatura, upgrade de plano ou cancelamento? Envie um e-mail para{" "}
          <span className="text-white/75">suporte@norat.io</span> informando o workspace{" "}
          <span className="font-mono text-white/65">{tenant.slug}</span>.
        </p>
      </section>
    </div>
  );
}
