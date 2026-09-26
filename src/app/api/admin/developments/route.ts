import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  createProductDevelopment,
  getProductDevelopment,
  listProductDevelopments,
  updateProductDevelopment,
} from "@/lib/db/product-developments";
import { getStoryboard } from "@/lib/db/storyboards";
import { getTrafficDomains } from "@/lib/db/traffic-campaigns";
import type { DevDoc, DevReferencePage } from "@/lib/product-dev/types";
import { stripScripts } from "@/lib/product-dev/plan";

function tableError(error: unknown) {
  const msg = error instanceof Error ? error.message : "Erro no desenvolvimento.";
  if (msg.includes("product_developments")) {
    return "Tabela não existe. Rode supabase/patch-product-development.sql no Supabase.";
  }
  return msg;
}

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const id = new URL(request.url).searchParams.get("id");
    const domains = await getTrafficDomains(ctx.tenantId);
    if (id) {
      const development = await getProductDevelopment(ctx.tenantId, id);
      if (!development) {
        return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
      }
      if (development.storyboardId) {
        const board = await getStoryboard(ctx.tenantId, development.storyboardId);
        if (!board) {
          const cleared = await updateProductDevelopment(ctx.tenantId, development.id, {
            storyboardId: null,
          });
          return NextResponse.json({ development: cleared, domains });
        }
      }
      return NextResponse.json({ development, domains });
    }
    const developments = await listProductDevelopments(ctx.tenantId);
    return NextResponse.json({ developments, domains });
  } catch (error) {
    return NextResponse.json({ error: tableError(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as { name?: string; brief?: string };
    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Nome do produto obrigatório." }, { status: 400 });
    }
    const development = await createProductDevelopment(ctx.tenantId, ctx.userId, {
      name: body.name,
      brief: body.brief,
    });
    return NextResponse.json({ development });
  } catch (error) {
    return NextResponse.json({ error: tableError(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      id?: string;
      name?: string;
      brief?: string;
      docs?: DevDoc[];
      referencePages?: DevReferencePage[];
      publishHostname?: string | null;
      publishPath?: string;
      publish?: boolean;
    };
    if (!body.id) {
      return NextResponse.json({ error: "Produto obrigatório." }, { status: 400 });
    }
    const current = await getProductDevelopment(ctx.tenantId, body.id);
    if (!current) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }

    const publishing = body.publish === true;
    if (publishing && !current.pageHtml.trim()) {
      return NextResponse.json(
        { error: "Processe o produto com o Grok antes de publicar." },
        { status: 400 }
      );
    }

    const development = await updateProductDevelopment(ctx.tenantId, body.id, {
      name: body.name,
      brief: body.brief,
      docs: body.docs,
      referencePages: body.referencePages,
      publishHostname:
        body.publishHostname === undefined ? undefined : body.publishHostname,
      publishPath: body.publishPath,
      pageHtml: publishing ? stripScripts(current.pageHtml) : undefined,
      status: publishing
        ? "published"
        : body.publishHostname === null
          ? "ready"
          : undefined,
    });
    return NextResponse.json({ development });
  } catch (error) {
    return NextResponse.json({ error: tableError(error) }, { status: 500 });
  }
}
