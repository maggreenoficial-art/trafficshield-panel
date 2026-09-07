import { NextResponse, type NextRequest } from "next/server";
import { syncBlockByTaskId } from "@/lib/kie/sync-block";

/**
 * Webhook Kie AI — público, protegido por token query.
 * Configure KIE_CALLBACK_SECRET (ou TRAFFIC_INTERNAL_SECRET).
 */
export async function POST(request: NextRequest) {
  const expected =
    process.env.KIE_CALLBACK_SECRET?.trim() ||
    process.env.TRAFFIC_INTERNAL_SECRET?.trim() ||
    "";
  const token = request.nextUrl.searchParams.get("token") ?? "";

  if (!expected || token !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as {
      data?: { taskId?: string };
      taskId?: string;
    };
    const taskId = body.data?.taskId || body.taskId;
    if (!taskId) {
      return NextResponse.json({ error: "taskId missing" }, { status: 400 });
    }

    await syncBlockByTaskId(taskId);
    return NextResponse.json({ code: 200, msg: "success" });
  } catch {
    return NextResponse.json({ code: 500, msg: "callback error" }, { status: 500 });
  }
}
