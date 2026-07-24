export function getErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = String((err as { message: unknown }).message);
    if (message.includes("origin_url")) {
      return `${message} Execute supabase/patch-domain-origin.sql no SQL Editor do Supabase.`;
    }
    return message;
  }
  return fallback;
}
