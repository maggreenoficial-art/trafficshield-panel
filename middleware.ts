import { NextResponse, type NextRequest } from "next/server";
import { isAdminUser, updateSession } from "@/lib/supabase/middleware";
import { handleCampaignRoute } from "@/lib/traffic-shield/campaign-middleware";

const PUBLIC_PATHS = ["/login", "/api/admin/auth"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/api/traffic/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/c/")) {
    const campaignResponse = await handleCampaignRoute(request);
    if (campaignResponse) return campaignResponse;
  }

  if (isPublicPath(pathname)) {
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

  if (
    !isPublicPath(pathname) &&
    (!user || !(await isAdminUser(supabase, user.id)))
  ) {
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
