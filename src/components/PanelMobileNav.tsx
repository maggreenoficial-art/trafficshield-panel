"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, panelNav, panelPageTitle } from "@/lib/panel-nav";
import { cn } from "@/lib/utils";
import { logoutPanel } from "@/lib/auth-logout";

export { panelPageTitle };

export function PanelMobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-black/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Navegação do painel"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around px-1 pt-1">
        {panelNav.map(({ href, label, icon: Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] transition-colors",
                isActive ? "text-white/80" : "text-white/40"
              )}
            >
              <Icon size={18} strokeWidth={1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => logoutPanel()}
          className="flex min-h-[3.25rem] flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] text-white/40 transition-colors hover:text-red-400/90"
        >
          <LogOut size={18} strokeWidth={1.75} />
          <span>Sair</span>
        </button>
      </div>
    </nav>
  );
}
