import { extractText } from "unpdf";
import {
  POLITICA_MAX_EACH,
  POLITICA_MAX_TOTAL,
  type PoliticaDoc,
} from "@/lib/politica/types";

export function cleanDocumentText(raw: string) {
  return raw
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function joinPoliticaDocuments(docs: PoliticaDoc[]) {
  const parts: string[] = [];
  let used = 0;
  for (const doc of docs) {
    const title = (doc.name || "documento").trim() || "documento";
    const body = cleanDocumentText(doc.text).slice(0, POLITICA_MAX_EACH);
    if (!body) continue;
    const block = `## ${title}\n${body}`;
    const room = POLITICA_MAX_TOTAL - used;
    if (room <= 40) break;
    const clipped = block.length > room ? `${block.slice(0, Math.max(0, room - 1))}…` : block;
    parts.push(clipped);
    used += clipped.length + 2;
  }
  return parts.join("\n\n");
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

  const cleaned = cleanDocumentText(text).slice(0, POLITICA_MAX_EACH);
  if (cleaned.length < 40) {
    throw new Error(
      isPdf
        ? "Esse PDF não tem texto selecionável. Se for só imagem, exporte como .txt."
        : "O arquivo está vazio demais para a mesa."
    );
  }
  return { name, text: cleaned };
}
