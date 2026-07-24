"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, LayoutDashboard, LogOut, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutPanel } from "@/lib/auth-logout";

const tabs = [
  { href: "/", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone, exact: false },
  { href: "/dominios", label: "Domínios", icon: Globe, exact: false },
] as const;

export function PanelMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/10 bg-black/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navegação do painel"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] tracking-wide transition-colors",
                isActive ? "text-accent" : "text-white/50"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => logoutPanel()}
          className="flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] tracking-wide text-white/50 transition-colors hover:text-red-400"
        >
          <LogOut size={20} strokeWidth={1.75} />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}

export function panelPageTitle(pathname: string): string {
  if (pathname.startsWith("/campanhas")) return "Campanhas";
  if (pathname.startsWith("/dominios")) return "Domínios";
  return "Início";
}
