/** Rate limit em memória (por instância). Melhor que nada em serverless. */

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as typeof globalThis & {
  __noratRateLimit?: Map<string, Bucket>;
};

function store(): Map<string, Bucket> {
  if (!globalStore.__noratRateLimit) {
    globalStore.__noratRateLimit = new Map();
  }
  return globalStore.__noratRateLimit;
}

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  const buckets = store();
  const entry = buckets.get(key);

  if (!entry || now >= entry.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { ok: true };
}

export function clientIpFromRequest(request: Request): string {
  const headers = (request as { headers: Headers }).headers;
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (forwarded) return forwarded;
  return headers.get("x-real-ip")?.trim() || "unknown";
}
