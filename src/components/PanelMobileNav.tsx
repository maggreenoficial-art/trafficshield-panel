"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/trafego", label: "Proteção", icon: Shield, exact: false },
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
                "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs tracking-wide transition-colors",
                isActive ? "text-accent" : "text-white/50"
              )}
            >
              <Icon size={20} strokeWidth={isActive ? 2.25 : 1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function panelPageTitle(pathname: string): string {
  if (pathname.startsWith("/trafego")) return "Proteção";
  return "Início";
}
