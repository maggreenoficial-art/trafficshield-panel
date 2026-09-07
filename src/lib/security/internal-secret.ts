/** Secret interno para logs/APIs internas — sem fallback fraco em produção. */
export function getInternalTrafficSecret(): string | null {
  const secret = process.env.TRAFFIC_INTERNAL_SECRET?.trim();
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "vp-traffic-dev";
  }

  return null;
}
