import { chatPoliticaSpeaker } from "@/lib/politica/kie-chat";
import { POLITICA_SPEAKERS, type PoliticaSpeakerId } from "@/lib/politica/speakers";

export const POLITICA_MAX_ROUNDS = 4;

export type PoliticaVote = "concordo" | "discordo";

export type PoliticaMessage = {
  id: string;
  speaker: PoliticaSpeakerId;
  round: number;
  text: string;
  vote: PoliticaVote | null;
  proposal: string;
};

export type PoliticaEvent =
  | { type: "status"; text: string }
  | { type: "message"; message: PoliticaMessage }
  | { type: "consensus"; text: string }
  | { type: "error"; text: string };

const VOTE_BLOCK =
  /===\s*voto:\s*(concordo|discordo)\s*proposta:\s*([\s\S]*?)\s*===/i;

export function parseSpeakerReply(raw: string) {
  const match = raw.match(VOTE_BLOCK);
  const vote = match?.[1]?.toLowerCase() === "concordo" ? "concordo" : match ? "discordo" : null;
  const proposal = match?.[2]?.replace(/\s+/g, " ").trim() ?? "";
  const text = (match ? raw.slice(0, match.index) : raw).replace(/\s+$/g, "").trim();
  return { text: text || raw.trim(), vote: vote as PoliticaVote | null, proposal };
}

export function lastVotesAgree(messages: PoliticaMessage[]) {
  const last = POLITICA_SPEAKERS.map((speaker) =>
    [...messages].reverse().find((message) => message.speaker === speaker.id)
  );
  return last.every((message) => message?.vote === "concordo");
}

function transcript(messages: PoliticaMessage[]) {
  if (!messages.length) return "(ainda ninguém falou)";
  return messages
    .map((message) => {
      const speaker = POLITICA_SPEAKERS.find((item) => item.id === message.speaker);
      const vote = message.vote ? ` [voto: ${message.vote}]` : "";
      return `${speaker?.name ?? message.speaker}${vote}:\n${message.text}`;
    })
    .join("\n\n");
}

function turnPrompt(input: {
  speakerName: string;
  house: string;
  job: string;
  document: string;
  brief: string;
  round: number;
  history: PoliticaMessage[];
}) {
  const first = input.round === 1 && input.history.length === 0;
  return `Você é ${input.speakerName} (${input.house}) numa mesa de desenvolvimento político.
Seu recorte: ${input.job}.
Fale em português do Brasil, direto, sem floreio. Não imite as outras IAs. Não invente fato que o documento não traz.

Documentos:
"""
${input.document}
"""

Pedido de quem abriu a mesa:
${input.brief || "Chegar no que é melhor produzir a partir destes documentos."}

Conversa até agora:
${transcript(input.history)}

${
  first
    ? "Você abre a mesa. Diga o que produzir, por quê, e o que deixaria de fora."
    : `Rodada ${input.round}. Responda às outras IAs. Aproxime o consenso: o que produzir, em que formato, e a ordem.`
}

No máximo 180 palavras. Termine EXATAMENTE neste bloco, sem markdown:

===
voto: concordo
proposta: uma frase com o que produzir
===

Use "voto: discordo" se ainda não aceita a proposta das outras.`;
}

function synthesisPrompt(document: string, brief: string, messages: PoliticaMessage[]) {
  return `Você fecha a mesa de desenvolvimento político. Escreva o consenso final, em português do Brasil.

Documentos (recorte):
"""
${document.slice(0, 12_000)}
"""

Pedido: ${brief || "O que é melhor produzir."}

Debate:
${transcript(messages)}

Entregue só o consenso, neste formato:

O QUE PRODUZIR
- ...

POR QUÊ
- ...

ORDEM
1. ...

O QUE NÃO FAZER
- ...

Se ainda houver desacordo, registre em uma linha no fim: "Aberto: ...". Sem voto no final.`;
}

export async function* runPoliticaRoundtable(input: {
  document: string;
  brief: string;
}): AsyncGenerator<PoliticaEvent> {
  const messages: PoliticaMessage[] = [];
  let serial = 0;

  for (let round = 1; round <= POLITICA_MAX_ROUNDS; round += 1) {
    for (const speaker of POLITICA_SPEAKERS) {
      yield { type: "status", text: `${speaker.name} está falando…` };
      const raw = await chatPoliticaSpeaker(
        speaker,
        turnPrompt({
          speakerName: speaker.name,
          house: speaker.house,
          job: speaker.job,
          document: input.document,
          brief: input.brief,
          round,
          history: messages,
        })
      );
      const parsed = parseSpeakerReply(raw);
      serial += 1;
      const message: PoliticaMessage = {
        id: `m${serial}`,
        speaker: speaker.id,
        round,
        text: parsed.text,
        vote: parsed.vote,
        proposal: parsed.proposal,
      };
      messages.push(message);
      yield { type: "message", message };
    }
    if (lastVotesAgree(messages)) break;
  }

  const closer = POLITICA_SPEAKERS[1];
  yield { type: "status", text: `${closer.name} fecha o consenso…` };
  const consensus = await chatPoliticaSpeaker(
    closer,
    synthesisPrompt(input.document, input.brief, messages)
  );
  yield { type: "consensus", text: consensus.trim() };
}
