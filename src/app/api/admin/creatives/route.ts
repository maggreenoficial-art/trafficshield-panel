import { NextResponse, type NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/api/panel-context";
import {
  countCreatives,
  createFolder,
  deleteAllCreatives,
  deleteCreative,
  listCreatives,
  listFolders,
} from "@/lib/db/creatives";

export async function GET(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folder") ?? undefined;
    const mediaType = searchParams.get("type") ?? undefined;

    const [folders, counts, creatives] = await Promise.all([
      listFolders(ctx.tenantId),
      countCreatives(ctx.tenantId),
      listCreatives(ctx.tenantId, {
        folderId: folderId === "all" ? undefined : folderId,
        mediaType,
      }),
    ]);

    return NextResponse.json({ folders, counts, creatives });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar criativos." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requirePlatformAdmin(request);
  if (ctx instanceof NextResponse) return ctx;

  try {
    const body = (await request.json()) as {
      action?: string;
      name?: string;
      id?: string;
    };

    if (body.action === "create_folder") {
      if (!body.name?.trim()) {
        return NextResponse.json({ error: "Nome obrigatório." }, { status: 400 });
      }
      const folder = await createFolder(ctx.tenantId, body.name);
      return NextResponse.json({ folder });
    }

    if (body.action === "delete_one" && body.id) {
      await deleteCreative(ctx.tenantId, body.id);
      return NextResponse.json({ ok: true });
    }

    if (body.action === "delete_all") {
      await deleteAllCreatives(ctx.tenantId);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erro na operação." }, { status: 500 });
  }
}
