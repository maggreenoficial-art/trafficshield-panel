/** Normaliza URL de destino da campanha (safe/offer). */
export function normalizeCampaignPageUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return trimmed;

  if (trimmed.startsWith("/")) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).href;
    } catch {
      return trimmed;
    }
  }

  if (/^[a-z0-9][\w.-]*\.[a-z]{2,}/i.test(trimmed)) {
    try {
      return new URL(`https://${trimmed}`).href;
    } catch {
      return `/${trimmed}`;
    }
  }

  return `/${trimmed}`;
}
