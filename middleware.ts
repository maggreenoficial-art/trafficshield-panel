import { NextResponse, type NextRequest } from "next/server";
import { canAccessPanel, updateSession } from "@/lib/supabase/middleware";
import { handleCustomDomainRoute } from "@/lib/traffic-shield/domain-routing";
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
