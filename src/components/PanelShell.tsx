"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LogOut, Shield } from "lucide-react";
import { PanelMobileNav, panelPageTitle } from "@/components/PanelMobileNav";

const nav = [
  { href: "/", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/trafego", label: "Traffic Shield", icon: Shield, exact: false },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/login";

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.assign("/login");
  };

  if (isLogin) {
    return <div className="min-h-screen bg-black text-white">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-black text-white">
      <aside className="hidden w-56 shrink-0 flex-col border-r border-white/10 p-6 lg:flex">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Shield size={20} className="text-accent" />
          Traffic Shield
        </Link>
        <p className="mt-1 text-[10px] tracking-widest text-muted uppercase">
          Proteção de campanhas
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
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto flex w-full items-center gap-2 px-3 py-2 text-xs text-muted hover:text-red-400"
        >
          <LogOut size={14} />
          Sair
        </button>
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
              Traffic Shield
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:text-red-400"
            aria-label="Sair"
          >
            <LogOut size={18} />
          </button>
        </header>

        <main className="admin-main flex-1 overflow-x-hidden">{children}</main>
        <PanelMobileNav />
      </div>
    </div>
  );
}
