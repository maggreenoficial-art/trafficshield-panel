export const FEED_WIDTH = 1080;
export const FEED_HEIGHT = 1080;
export const FEED_MARGIN = 60;
export const FEED_BAR_WIDTH = 180;
export const FEED_BAR_HEIGHT = 10;
export const FEED_BAR_COLOR = "#D7141A";
export const FEED_HANDLE = "@informacassilandia";
export const FEED_MAX_WORDS = 14;
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
  const titled = words.slice(0, FEED_MAX_WORDS).map((word) => {
    const red = word.marked && !STOP.has(fold(word.text)) && budget > 0;
    if (red) budget -= 1;
    return { text: word.text, red };
  });
  return highlightMainDeath(paintContinuous(titled));
}

function paintContinuous(words: FeedWord[]) {
  let first = -1;
  let last = -1;
  words.forEach((word, index) => {
    if (!word.red) return;
    if (first < 0) first = index;
    last = index;
  });
  if (first < 0 || last === first) return words;
  return words.map((word, index) =>
    index > first && index < last && STOP.has(fold(word.text)) ? { ...word, red: true } : word
  );
}

function highlightMainDeath(words: FeedWord[]) {
  const index = words.findIndex((word) => DEATH_WORD.test(fold(word.text)));
  if (index < 0) return words;
  return words.map((word, wordIndex) => ({ ...word, red: wordIndex === index }));
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

export const HEADLINE_VERB_RULE =
  'Ao encurtar o título, verifique se o verbo combina com o objeto. Ex.: "inicia projeto", "instala contêineres", nunca "inicia contêineres".';

export const HEADLINE_SPECIFIC_RULE =
  'O título precisa dizer O QUÊ concretamente aconteceu. Palavras genéricas como "projeto", "ação", "iniciativa" ou "programa" nunca podem ficar sozinhas; sempre diga do que se trata (ex.: "projeto-piloto de coleta de lixo").';

export const HEADLINE_RED_RULE =
  "As palavras em vermelho devem ser um trecho contínuo do título.";

export const HEADLINE_DEATH_RULE =
  'Em notícias de morte, o fato principal é a morte: ela vem primeiro no título e é a palavra destacada em vermelho. Nunca empilhe duas frases soltas; ligue as informações com "após", "e" ou ponto e vírgula. Toda informação que aparece em uma foto (ex.: droga apreendida) precisa estar explicada no título ou ser retirada da arte.';

const DEATH_WORD = /^(?:morre|morrem|morreu|mata|matou|morte)$/;

export function isArtLayerPrompt(prompt: string) {
  return prompt.trimStart().startsWith(ART_LAYER_MARK);
}

export function promptWithoutArtLayerMark(prompt: string) {
  return prompt.replace(/^ART_LAYER_ONLY\.?\s*/, "");
}

export function composeFeedImagePrompt(input: {
  headline: string;
  urgent: boolean;
  hasPhoto: boolean;
}) {
  const words = buildFeedTitle(input.headline);
  const headline = words.map((word) => word.text).join(" ");
  const redWords = redPhrases(words);
  const urgentTag = input.urgent
    ? "Yellow rectangle at the top left, 50px from the edges, with the word URGENTE in black condensed extra bold. No other badge."
    : "No urgent tag. Leave the top left empty. Do not write URGENTE.";
  return `${ART_LAYER_MARK}. Transparent PNG, exactly 1080x1080. This is ONLY the graphic layer of an Instagram feed post (1:1); a photo will be placed underneath by code in the area y = 0 to 704. Do not draw any photo, person, place or object.

REFERENCES:
- Reference 1: style template. Copy its typography, colors and proportions only.
- Reference 2: brand logo. Reproduce it faithfully in WHITE.

ELEMENTS (exact positions):
- From y = 0 to 704: fully transparent except the logo and the tag. Do NOT draw any gradient; it is applied by code.
- LOGO: white, 330px wide, top right, 50px from the top and right edges, no box behind it.
- TAG: ${urgentTag}
- From y = 704 to 1080: solid black #000000.
- RED BAR: #D7141A, 180x10px, at x = 60, y = 720.
- HEADLINE: starts at y = 744, x = 60, maximum width 960px, ends before y = 976. Exactly 3 lines; reduce the font size until it fits. Never leave a single word alone on the last line. White, ALL CAPS, condensed extra bold (Barlow Condensed ExtraBold style), tight line spacing, flat text with NO glow, shadow or outline.
  Exact text, letter by letter, Portuguese accents, no period: "${headline}"
  Color ONLY these words in red #D7141A: "${redWords.join(", ") || "none"}".
- FOOTER: "@informacassilandia" centered at y = 1032, white, small, thin sans-serif. The "@" is mandatory.

RULES: all text upright and readable; no other text; no other logo.`;
}

function redPhrases(words: FeedWord[]) {
  const phrases: string[] = [];
  let index = 0;
  while (index < words.length) {
    if (!words[index].red) {
      index += 1;
      continue;
    }
    const group: string[] = [];
    while (index < words.length && words[index].red) {
      group.push(words[index].text);
      index += 1;
    }
    phrases.push(group.join(" "));
  }
  return phrases;
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
