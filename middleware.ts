import { NextResponse, type NextRequest } from "next/server";
import {
  canAccessPanel,
  isAdminUser,
  updateSession,
} from "@/lib/supabase/middleware";
import { handleCustomDomainRoute } from "@/lib/traffic-shield/domain-routing";
import { handleCampaignRoute } from "@/lib/traffic-shield/campaign-middleware";

const PUBLIC_PATHS = ["/", "/login", "/api/admin/auth"];

const ADMIN_ONLY_PATH_PREFIXES = ["/storyboards", "/criativos"];

function isPublicPath(pathname: string): boolean {
  return (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/c/") ||
    pathname.startsWith("/api/traffic/") ||
    pathname.startsWith("/api/kie/")
  );
}

function isAdminOnlyPath(pathname: string): boolean {
  return ADMIN_ONLY_PATH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  try {
    const customDomainResponse = await handleCustomDomainRoute(request);
    if (customDomainResponse) return customDomainResponse;

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
      if (!user || !(await canAccessPanel(user.id))) {
        return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
      }
      return supabaseResponse;
    }

    if (
      !isPublicPath(pathname) &&
      (!user || !(await canAccessPanel(user.id)))
    ) {
      const login = new URL("/login", request.url);
      login.searchParams.set("from", pathname);
      return NextResponse.redirect(login);
    }

    if (user && isAdminOnlyPath(pathname)) {
      const admin = await isAdminUser(supabase, user.id);
      if (!admin) {
        return NextResponse.redirect(new URL("/painel", request.url));
      }
    }

    return supabaseResponse;
  } catch (error) {
    console.error("[middleware]", error);

    if (isPublicPath(pathname) || pathname === "/login") {
      return NextResponse.next();
    }

    return NextResponse.json(
      {
        error:
          "Configuração incompleta. Defina as variáveis do Supabase na Vercel.",
      },
      { status: 503 }
    );
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
