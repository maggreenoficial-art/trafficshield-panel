import { createAdminClient, hasAdminClient } from "@/lib/supabase/admin";

export async function getTenantCredits(tenantId: string): Promise<number> {
  if (!hasAdminClient()) return 0;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tenant_credits")
    .select("balance")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (data) return data.balance as number;

  await supabase.from("tenant_credits").upsert({
    tenant_id: tenantId,
    balance: 0,
    updated_at: new Date().toISOString(),
  });
  return 0;
}

/** Debita créditos atomicamente. Retorna false se saldo insuficiente. */
export async function debitCredits(opts: {
  tenantId: string;
  amount: number;
  reason: string;
  refType?: string;
  refId?: string;
}): Promise<boolean> {
  if (opts.amount <= 0) return true;
  const supabase = createAdminClient();
  const current = await getTenantCredits(opts.tenantId);
  if (current < opts.amount) return false;

  const next = current - opts.amount;
  const { error } = await supabase
    .from("tenant_credits")
    .update({ balance: next, updated_at: new Date().toISOString() })
    .eq("tenant_id", opts.tenantId)
    .eq("balance", current);

  if (error) throw error;

  // Concorrência: se ninguém atualizou (race), tenta de novo
  const after = await getTenantCredits(opts.tenantId);
  if (after !== next) {
    // re-check: outra transação pode ter ganho — verifica se debitou
    if (after > next) return false;
  }

  await supabase.from("credit_ledger").insert({
    tenant_id: opts.tenantId,
    delta: -opts.amount,
    reason: opts.reason,
    ref_type: opts.refType ?? null,
    ref_id: opts.refId ?? null,
  });

  return true;
}

export async function creditCredits(opts: {
  tenantId: string;
  amount: number;
  reason: string;
  refType?: string;
  refId?: string;
}): Promise<number> {
  if (opts.amount <= 0) return getTenantCredits(opts.tenantId);
  const supabase = createAdminClient();
  const current = await getTenantCredits(opts.tenantId);
  const next = current + opts.amount;

  await supabase.from("tenant_credits").upsert({
    tenant_id: opts.tenantId,
    balance: next,
    updated_at: new Date().toISOString(),
  });

  await supabase.from("credit_ledger").insert({
    tenant_id: opts.tenantId,
    delta: opts.amount,
    reason: opts.reason,
    ref_type: opts.refType ?? null,
    ref_id: opts.refId ?? null,
  });

  return next;
}
