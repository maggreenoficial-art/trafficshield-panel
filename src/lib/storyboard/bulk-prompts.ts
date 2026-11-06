/** Separa prompts colados em massa.
 * Linha em branco (ou uma linha só com ---) divide prompts de várias linhas.
 * Sem linha em branco, cada linha é um prompt.
 */
export function parseBulkPrompts(raw: string): string[] {
  const text = raw.replace(/\r\n/g, "\n").trim();
  if (!text) return [];

  if (/^\s*---\s*$/m.test(text)) {
    return text
      .split(/^\s*---\s*$/m)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;

  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function imageDownloadName(index: number, prompt: string, ext: string) {
  const base = prompt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
  const n = String(index + 1).padStart(2, "0");
  const safeExt = ext.replace(/[^a-z0-9]/gi, "") || "png";
  return `${n}-${base || "imagem"}.${safeExt}`;
}
