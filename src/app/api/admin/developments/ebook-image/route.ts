import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  getProductDevelopment,
  updateProductDevelopment,
} from "@/lib/db/product-developments";
import { buildKieInput, createKieTask, getKieTaskInfo } from "@/lib/kie/client";
import type { DevReferencePage } from "@/lib/product-dev/types";

export const maxDuration = 180;

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { id?: string };
    if (!body.id) {
      return NextResponse.json({ error: "Produto obrigatório." }, { status: 400 });
    }
    const current = await getProductDevelopment(ctx.tenantId, body.id);
    if (!current) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    const ebooks = current.referencePages.filter(
      (item) => item.kind === "text" && item.text.trim()
    );
    if (!ebooks.length) {
      return NextResponse.json(
        { error: "Envie o PDF do ebook antes de criar a imagem." },
        { status: 400 }
      );
    }

    const excerpt = ebooks
      .map((item) => item.text.slice(0, 1200))
      .join("\n")
      .slice(0, 1800);
    const prompt = `Vertical 9:16 photo of one physical recipe ebook, cover facing camera and one page open. The open page shows a real recipe from this text, with the dish name and the ingredients readable. Appetizing food on the page, sharp cover, no person, soft plain background, so someone can hold this book later. Product: ${current.name}. Source: ${excerpt}`;
    const input = buildKieInput({
      modelKey: "image",
      kieModel: "gpt-image-2-text-to-image",
      prompt,
      aspectRatio: "9:16",
      resolution: "1K",
      referenceUrls: [],
    });
    const { taskId } = await createKieTask({
      model: "gpt-image-2-text-to-image",
      input,
    });

    let url = "";
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const info = await getKieTaskInfo(taskId);
      if (info.state === "success" && info.resultUrls[0]) {
        url = info.resultUrls[0];
        break;
      }
      if (info.state === "fail") {
        throw new Error(info.failMsg || "A Kie não gerou a imagem do ebook.");
      }
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
    if (!url) {
      throw new Error("A imagem do ebook demorou demais. Tente de novo.");
    }

    const referencePages: DevReferencePage[] = [
      ...current.referencePages.filter(
        (item) => !(item.kind === "image" && item.title === "Ebook")
      ),
      {
        kind: "image",
        url,
        title: "Ebook",
        text: "imagem do ebook para o take final",
      },
    ];
    const development = await updateProductDevelopment(ctx.tenantId, current.id, {
      referencePages,
    });
    return NextResponse.json({ development });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Falha na imagem do ebook.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
