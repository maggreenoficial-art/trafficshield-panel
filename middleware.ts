import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser, updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login", "/api/admin/auth"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p)) {
    const { supabaseResponse } = await updateSession(request);
    return supabaseResponse;
  }

  const { supabase, user, supabaseResponse } = await updateSession(request);

  if (pathname.startsWith("/api/admin")) {
    if (!user || !(await isAdminUser(supabase, user.id))) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }
    return supabaseResponse;
  }

  if (!user || !(await isAdminUser(supabase, user.id))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("from", pathname);
    return NextResponse.redirect(login);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
