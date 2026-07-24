export function normalizeHostname(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export const DOMAIN_SLOT_LIMIT = Number(
  process.env.TRAFFIC_DOMAIN_SLOT_LIMIT ?? "10"
);
