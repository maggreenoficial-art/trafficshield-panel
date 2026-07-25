const DAY_MS = 1000 * 60 * 60 * 24;

export function getSubscriptionWindow(input: {
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}): { startsAt: Date; endsAt: Date } {
  const startsAt = new Date(input.startsAt || input.createdAt);
  const endsAt = input.endsAt
    ? new Date(input.endsAt)
    : new Date(startsAt.getTime() + 30 * DAY_MS);
  return { startsAt, endsAt };
}

export function getSubscriptionProgress(input: {
  startsAt: string;
  endsAt: string | null;
  createdAt: string;
}): {
  daysTotal: number;
  daysElapsed: number;
  daysRemaining: number;
  percentElapsed: number;
  isExpired: boolean;
} {
  const now = Date.now();
  const { startsAt, endsAt } = getSubscriptionWindow(input);
  const startMs = startsAt.getTime();
  const endMs = endsAt.getTime();
  const totalMs = Math.max(endMs - startMs, DAY_MS);

  const daysTotal = Math.max(1, Math.ceil(totalMs / DAY_MS));
  const daysElapsed = Math.min(
    daysTotal,
    Math.max(0, Math.ceil((now - startMs) / DAY_MS))
  );
  const daysRemaining = Math.max(0, Math.ceil((endMs - now) / DAY_MS));
  const percentElapsed = Math.min(
    100,
    Math.max(0, Math.round(((now - startMs) / totalMs) * 100))
  );

  return {
    daysTotal,
    daysElapsed,
    daysRemaining,
    percentElapsed,
    isExpired: now > endMs,
  };
}

export function formatPanelDate(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatBillingInterval(interval: "monthly" | "yearly"): string {
  return interval === "yearly" ? "Anual" : "Mensal";
}
