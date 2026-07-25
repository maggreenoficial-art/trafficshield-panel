"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  LayoutDashboard,
  LogOut,
  Megaphone,
} from "lucide-react";
import { PanelMobileNav, panelPageTitle } from "@/components/PanelMobileNav";
import { NoratLogo } from "@/components/NoratLogo";
import { panelNavItem } from "@/lib/panel-styles";
import { logoutPanel } from "@/lib/auth-logout";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/painel", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone, exact: false },
  { href: "/dominios", label: "Domínios", icon: Globe, exact: false },
] as const;

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStandalone =
    pathname === "/" || pathname === "/login";

  if (isStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-56 shrink-0 flex-col border-r border-white/[0.06] bg-black p-5 lg:flex">
        <Link href="/painel" className="block py-1">
          <NoratLogo priority size="md" />
        </Link>

        <nav className="landing-nav-pill mt-8 flex flex-col gap-0.5 rounded-2xl p-1.5">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-full px-3 py-2 text-[13px] transition-colors",
                  panelNavItem(active)
                )}
              >
                <Icon
                  size={15}
                  strokeWidth={1.75}
                  className={active ? "text-white/70" : "text-white/35"}
                />
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => logoutPanel()}
            className="mt-1 flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-[13px] text-white/40 transition-colors hover:bg-red-500/[0.06] hover:text-red-400/90"
          >
            <LogOut size={15} strokeWidth={1.75} />
            Sair
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:ml-56">
        <header
          className="admin-mobile-header fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-3 border-b border-white/[0.06] bg-black/95 px-4 py-3 backdrop-blur-md lg:hidden"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
        >
          <Link href="/painel" className="shrink-0 py-0.5">
            <NoratLogo size="sm" />
          </Link>
          <p className="min-w-0 truncate text-right text-sm text-white/60">
            {panelPageTitle(pathname)}
          </p>
        </header>

        <main className="admin-main flex-1 overflow-x-hidden">{children}</main>
        <PanelMobileNav />
      </div>
    </div>
  );
}
