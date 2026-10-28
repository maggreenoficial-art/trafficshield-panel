import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import { joinPoliticaDocuments } from "@/lib/politica/document";
import { POLITICA_MAX_TOTAL, type PoliticaDoc } from "@/lib/politica/types";
import { runPoliticaRoundtable } from "@/lib/politica/roundtable";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  let body: { document?: string; documents?: PoliticaDoc[]; brief?: string };
  try {
    body = (await request.json()) as {
      document?: string;
      documents?: PoliticaDoc[];
      brief?: string;
    };
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400 });
  }

  const packed = Array.isArray(body.documents)
    ? joinPoliticaDocuments(body.documents)
    : (body.document ?? "").trim();
  const document = packed.trim();
  const brief = (body.brief ?? "").trim().slice(0, 800);
  if (document.length < 40) {
    return NextResponse.json({ error: "Envie ao menos um documento antes de abrir a mesa." }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: unknown) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        for await (const event of runPoliticaRoundtable({
          document: document.slice(0, POLITICA_MAX_TOTAL),
          brief,
        })) {
          send(event);
        }
      } catch (error) {
        const text =
          error instanceof Error ? error.message : "A mesa não conseguiu terminar.";
        send({ type: "error", text });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
