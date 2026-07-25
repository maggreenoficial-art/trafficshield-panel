import type { TenantPlan, TenantStatus } from "@/lib/tenant/types";

export const PLAN_LABELS: Record<TenantPlan, string> = {
  starter: "Starter",
  pro: "Pro",
  enterprise: "Scale",
};

export const PLAN_PRICES: Record<TenantPlan, string> = {
  starter: "R$ 197/mês",
  pro: "R$ 597/mês",
  enterprise: "R$ 997/mês",
};

export const PLAN_CLICKS: Record<TenantPlan, string> = {
  starter: "20.000 cliques/mês",
  pro: "100.000 cliques/mês",
  enterprise: "300.000 cliques/mês",
};

export const TENANT_STATUS_LABELS: Record<TenantStatus, string> = {
  active: "Ativa",
  suspended: "Suspensa",
  cancelled: "Cancelada",
};

export const MEMBER_ROLE_LABELS = {
  owner: "Proprietário",
  admin: "Administrador",
  member: "Membro",
} as const;
