import { extractText } from "unpdf";

const MAX_CHARS = 24_000;

export function cleanDocumentText(raw: string) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_CHARS);
}

export async function readPoliticaDocument(file: File) {
  const name = file.name || "documento";
  if (file.size > 12_000_000) {
    throw new Error("O arquivo passa de 12 MB.");
  }
  const isPdf = file.type === "application/pdf" || name.toLowerCase().endsWith(".pdf");
  const isText = /\.(txt|md|markdown)$/i.test(name) || file.type.startsWith("text/");
  if (!isPdf && !isText) {
    throw new Error("Envie PDF, TXT ou Markdown.");
  }

  let text = "";
  if (isPdf) {
    const data = new Uint8Array(await file.arrayBuffer());
    const extracted = await extractText(data, { mergePages: true });
    text = Array.isArray(extracted.text) ? extracted.text.join("\n\n") : extracted.text;
  } else {
    text = await file.text();
  }

  const cleaned = cleanDocumentText(text);
  if (cleaned.length < 40) {
    throw new Error(
      isPdf
        ? "Esse PDF não tem texto selecionável. Se for só imagem, exporte como .txt."
        : "O arquivo está vazio demais para a mesa."
    );
  }
  return { name, text: cleaned };
}
