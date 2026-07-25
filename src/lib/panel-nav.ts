import {
  Globe,
  LayoutDashboard,
  LogOut,
  Megaphone,
  User,
  type LucideIcon,
} from "lucide-react";

export type PanelNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact: boolean;
};

export const panelNav: PanelNavItem[] = [
  { href: "/painel", label: "Início", icon: LayoutDashboard, exact: true },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone, exact: false },
  { href: "/dominios", label: "Domínios", icon: Globe, exact: false },
  { href: "/perfil", label: "Conta", icon: User, exact: false },
];

export { LogOut };

export function panelPageTitle(pathname: string): string {
  if (pathname.startsWith("/campanhas")) return "Campanhas";
  if (pathname.startsWith("/dominios")) return "Domínios";
  if (pathname.startsWith("/perfil")) return "Conta";
  if (pathname.startsWith("/painel")) return "Início";
  return "Painel";
}
