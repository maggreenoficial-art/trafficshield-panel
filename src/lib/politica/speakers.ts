export const POLITICA_SPEAKERS = [
  {
    id: "gemini",
    name: "Gemini",
    house: "Google",
    protocol: "openai" as const,
    path: "/gemini-3-pro/v1/chat/completions",
    model: "gemini-3-pro",
    job: "impacto popular e clareza: o que o eleitor entende e o que cola",
  },
  {
    id: "anthropic",
    name: "Claude",
    house: "Anthropic",
    protocol: "anthropic" as const,
    path: "/claude/v1/messages",
    model: "claude-sonnet-4-5",
    fallbacks: ["claude-sonnet-4-6", "claude-haiku-4-5"],
    job: "risco, ética e consistência: o que não pode ser dito ou prometido",
  },
  {
    id: "gpt",
    name: "GPT",
    house: "OpenAI",
    protocol: "openai" as const,
    path: "/gpt-5-2/v1/chat/completions",
    model: "gpt-5-2",
    job: "execução: formato, ordem e o que produzir primeiro",
  },
] as const;

export type PoliticaSpeakerId = (typeof POLITICA_SPEAKERS)[number]["id"];
export type PoliticaSpeaker = (typeof POLITICA_SPEAKERS)[number];

export function politicaSpeaker(id: string) {
  return POLITICA_SPEAKERS.find((speaker) => speaker.id === id) ?? null;
}
