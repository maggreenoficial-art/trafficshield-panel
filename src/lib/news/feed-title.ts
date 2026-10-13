export const FEED_WIDTH = 1080;
export const FEED_HEIGHT = 1350;
export const FEED_MARGIN = 60;
export const FEED_BAR_WIDTH = 180;
export const FEED_BAR_HEIGHT = 10;
export const FEED_BAR_COLOR = "#D7141A";
export const FEED_HANDLE = "@informacassilandia";
export const FEED_MAX_WORDS = 10;
export const FEED_MAX_LINES = 4;

const STOP = new Set([
  "a",
  "o",
  "as",
  "os",
  "um",
  "uma",
  "de",
  "da",
  "do",
  "das",
  "dos",
  "em",
  "na",
  "no",
  "nas",
  "nos",
  "para",
  "pra",
  "por",
  "com",
  "e",
  "que",
  "se",
  "ao",
  "aos",
]);

const URGENT =
  /\b(?:acidente|capot\w*|batida|colisao|atropel\w*|crime|criminos\w*|roubo|furt\w*|homicid\w*|assalto|trafico|preso|prisao|agress\w*|morte|morre\w*|obito|falec\w*|morto|morta|desastre|enchente|incendio|explos\w*|desab\w*|temporal|vendaval|apagao|desabastec\w*|surto|dengue|intoxic\w*|epidemia)\b|\bfalta de agua\b|\bfalta de luz\b|\bsem agua\b|\bsem luz\b|\balerta de saude\b/;

export type FeedWord = {
  text: string;
  red: boolean;
};

function fold(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("pt-BR");
}

export function isUrgentNews(text: string) {
  return URGENT.test(fold(text));
}

function tokenize(raw: string) {
  const clean = raw.trim().replace(/[.!?…]+$/g, "");
  const words: { text: string; marked: boolean }[] = [];
  for (const part of clean.split(/(\[[^\]]+\])/)) {
    if (!part.trim()) continue;
    const marked = part.startsWith("[") && part.endsWith("]");
    const inner = marked ? part.slice(1, -1) : part;
    for (const token of inner.split(/\s+/)) {
      const text = token.replace(/^["“”'`]+|["“”'`]+$/g, "").toLocaleUpperCase("pt-BR");
      if (text) words.push({ text, marked });
    }
  }
  return words;
}

function dropPlace(words: { text: string; marked: boolean }[]) {
  const keys = words.map((word) => fold(word.text));
  for (let index = 0; index < keys.length - 1; index += 1) {
    const lead = keys[index];
    if ((lead === "de" || lead === "da" || lead === "do" || lead === "em") && keys[index + 1] === "cassilandia") {
      words.splice(index, 2);
      return;
    }
  }
}

export function buildFeedTitle(raw: string): FeedWord[] {
  const words = tokenize(raw);
  if (words.length > FEED_MAX_WORDS) dropPlace(words);
  let budget = 3;
  return words.slice(0, FEED_MAX_WORDS).map((word) => {
    const red = word.marked && !STOP.has(fold(word.text)) && budget > 0;
    if (red) budget -= 1;
    return { text: word.text, red };
  });
}

export function formatFeedHeadline(words: FeedWord[]) {
  const parts: string[] = [];
  let index = 0;
  while (index < words.length) {
    if (!words[index].red) {
      parts.push(words[index].text);
      index += 1;
      continue;
    }
    const group: string[] = [];
    while (index < words.length && words[index].red) {
      group.push(words[index].text);
      index += 1;
    }
    parts.push(`[${group.join(" ")}]`);
  }
  return parts.join(" ");
}

export const ART_LAYER_MARK = "ART_LAYER_ONLY";

export const HEADLINE_EDITOR_RULE =
  "O título deve ser português natural e correto, com todas as preposições e artigos necessários (de, do, da, no, na, em, para) e hífens corretos (projeto-piloto). Pode resumir, mas nunca escreva em estilo telegrama. A regra das palavras em vermelho só define o que é PINTADO, nunca o que é removido do texto.";

export function isArtLayerPrompt(prompt: string) {
  return prompt.trimStart().startsWith(ART_LAYER_MARK);
}

export function promptWithoutArtLayerMark(prompt: string) {
  return prompt.replace(/^ART_LAYER_ONLY\s*/, "");
}

export function composeFeedImagePrompt(input: {
  headline: string;
  urgent: boolean;
  hasPhoto: boolean;
}) {
  const words = buildFeedTitle(input.headline);
  const headline = words.map((word) => word.text).join(" ");
  const redWords = words.filter((word) => word.red).map((word) => word.text);
  const urgentTag = input.urgent
    ? 'Yellow rectangle at the top left, 50px from the edges, with the word URGENTE in black condensed extra bold. No other badge.'
    : "No urgent tag. Leave the top left empty. Do not write URGENTE.";
  return `${ART_LAYER_MARK}
Instagram feed news post ART LAYER only, vertical 4:5 aspect ratio (1080x1350), sharp and professional. Fully transparent background.

Do not draw a photograph, person, face, place, object or sign. The original news photo is placed underneath this layer by code and must not be redrawn. Pixels that are not the logo, the urgent tag, the gradient, the red bar, the headline or the footer stay fully transparent.

REFERENCES:
- Reference 1 is a STYLE TEMPLATE, not a frame. Copy its design system exactly (positions, sizes, colors, typography, gradient), but do not copy its photo or its headline. Nothing from the old photo or old headline may appear.
- Reference 2 is the brand logo. Reproduce it faithfully in WHITE, top right corner, about 30% of the image width, 50px margin, placed with NO box or background behind it.
- ${input.hasPhoto ? "There is no news photo in the references. Do not invent one." : "There is no news photo. Keep the background transparent."}

LAYOUT, top to bottom:
1. Logo (reference 2), top right, white.
2. ${urgentTag}
3. Black gradient: fully transparent at the middle of the image, solid black #000000 at the bottom.
4. Solid red bar #D7141A, 180x10px, left-aligned with 60px margin, directly above the headline.
5. Headline, left-aligned, 60px margin, white, ALL CAPS, condensed extra bold font (Barlow Condensed ExtraBold style), tight line spacing, maximum 4 lines, up to 80% of the width.
   Exact headline text, letter by letter, in Portuguese, with all accents, no period at the end:
   "${headline}"
   Color ONLY these words in red #D7141A: "${redWords.join(", ") || "none"}". Everything else in white.
6. Footer, centered, 50px from the bottom: the exact text "@informacassilandia" — the "@" symbol is mandatory.

RULES:
- All text upright and readable. Never mirror, flip, rotate or cut letters.
- No other text besides the headline, the urgent tag (if any) and the @.
- Do not invent another layout, logo, newspaper or phone.`;
}

export function wrapFeedTitle(
  words: FeedWord[],
  widthOf: (text: string) => number,
  maxWidth: number
) {
  const lines: FeedWord[][] = [];
  let current: FeedWord[] = [];
  for (const word of words) {
    const trial = [...current, word].map((item) => item.text).join(" ");
    if (current.length && widthOf(trial) > maxWidth) {
      lines.push(current);
      current = [word];
    } else {
      current.push(word);
    }
  }
  if (current.length) lines.push(current);
  return lines;
}
