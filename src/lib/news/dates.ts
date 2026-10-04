export const NEWS_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

export function parseNewsDate(raw: string | null | undefined): Date | null {
  if (!raw?.trim()) return null;
  const time = Date.parse(raw);
  if (Number.isNaN(time)) return null;
  return new Date(time);
}

export function toNewsIso(raw: string | null | undefined): string | null {
  return parseNewsDate(raw)?.toISOString() ?? null;
}

export function isRecentNews(
  raw: string | null | undefined,
  now = Date.now(),
  maxAge = NEWS_MAX_AGE_MS
) {
  const date = parseNewsDate(raw);
  if (!date) return false;
  const age = now - date.getTime();
  return age <= maxAge && date.getTime() <= now + 60_000;
}

export function relativeNewsAge(date: Date, now = Date.now()) {
  const diff = Math.max(0, now - date.getTime());
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "há 1 dia";
  if (days < 30) return `há ${days} dias`;
  const months = Math.round(days / 30);
  if (months === 1) return "há 1 mês";
  if (months < 12) return `há ${months} meses`;
  const years = Math.round(months / 12);
  return years === 1 ? "há 1 ano" : `há ${years} anos`;
}

export function formatNewsWhen(raw: string | null | undefined, now = Date.now()) {
  const date = parseNewsDate(raw);
  if (!date) return "Sem data";
  const absolute = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
  return `${absolute} · ${relativeNewsAge(date, now)}`;
}
