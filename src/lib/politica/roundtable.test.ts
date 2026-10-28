import assert from "node:assert/strict";
import test from "node:test";
import { extractChatText } from "./kie-chat";
import { lastVotesAgree, parseSpeakerReply } from "./roundtable";
import type { PoliticaMessage } from "./roundtable";

test("o voto e a proposta saem do bloco final", () => {
  const parsed = parseSpeakerReply(
    "Produzir um vídeo curto sobre o mutirão.\n\n===\nvoto: concordo\nproposta: vídeo de 40s no mutirão\n==="
  );
  assert.equal(parsed.vote, "concordo");
  assert.equal(parsed.proposal, "vídeo de 40s no mutirão");
  assert.match(parsed.text, /vídeo curto/);
  assert.doesNotMatch(parsed.text, /===/);
});

test("a mesa só fecha quando as três concordam na última fala", () => {
  const base = {
    round: 2,
    text: "ok",
    proposal: "vídeo",
  };
  const messages: PoliticaMessage[] = [
    { id: "1", speaker: "gemini", vote: "discordo", ...base },
    { id: "2", speaker: "anthropic", vote: "concordo", ...base },
    { id: "3", speaker: "gpt", vote: "concordo", ...base },
  ];
  assert.equal(lastVotesAgree(messages), false);
  messages.push({ id: "4", speaker: "gemini", vote: "concordo", ...base, round: 3 });
  assert.equal(lastVotesAgree(messages), true);
});

test("o texto vem tanto do GPT quanto do Claude", () => {
  assert.equal(
    extractChatText({
      choices: [{ message: { content: "proposta da GPT" } }],
    }),
    "proposta da GPT"
  );
  assert.equal(
    extractChatText({
      content: [{ type: "text", text: "proposta do Claude" }],
    }),
    "proposta do Claude"
  );
});
