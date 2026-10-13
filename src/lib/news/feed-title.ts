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
