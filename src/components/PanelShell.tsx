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
import { logoutPanel } from "@/lib/auth-logout";

const nav = [
  { href: "/", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone, exact: false },
  { href: "/dominios", label: "Domínios", icon: Globe, exact: false },
] as const;

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  if (isLogin) {
    return <div className="min-h-screen bg-black text-white">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 p-6 lg:flex">
        <Link href="/" className="flex items-center gap-2">
          <NoratLogo size={28} showWordmark wordmarkClassName="text-base" />
        </Link>
        <p className="mt-1 text-[10px] tracking-widest text-muted uppercase">
          Contra ratos digitais
        </p>

        <nav className="mt-10 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-accent/10 text-accent"
                    : "text-muted hover:text-white"
                }`}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}

          <button
            type="button"
            onClick={() => logoutPanel()}
            className="mt-2 flex w-full items-center gap-3 rounded px-3 py-2 text-sm text-muted transition-colors hover:text-red-400"
          >
            <LogOut size={16} />
            Sair
          </button>
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="admin-mobile-header sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-black/95 px-4 py-3 backdrop-blur-md lg:hidden"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top, 0px))" }}
        >
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold leading-tight">
              {panelPageTitle(pathname)}
            </p>
            <p className="text-[10px] tracking-widest text-muted uppercase">
              norat
            </p>
          </div>
        </header>

        <main className="admin-main flex-1 overflow-x-hidden">{children}</main>
        <PanelMobileNav />
      </div>
    </div>
  );
}
