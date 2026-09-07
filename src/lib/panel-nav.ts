import {
  Clapperboard,
  Globe,
  Images,
  LayoutDashboard,
  LifeBuoy,
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
  { href: "/storyboards", label: "Storyboards", icon: Clapperboard, exact: false },
  { href: "/criativos", label: "Criativos", icon: Images, exact: false },
  { href: "/dominios", label: "Domínios", icon: Globe, exact: false },
  { href: "/suporte", label: "Suporte", icon: LifeBuoy, exact: false },
  { href: "/perfil", label: "Conta", icon: User, exact: false },
];

export { LogOut };

export function panelPageTitle(pathname: string): string {
  if (pathname.startsWith("/campanhas")) return "Campanhas";
  if (pathname.match(/^\/storyboards\/[^/]+/)) return "Editor";
  if (pathname.startsWith("/storyboards")) return "Storyboards";
  if (pathname.startsWith("/criativos")) return "Criativos";
  if (pathname.startsWith("/dominios")) return "Domínios";
  if (pathname.startsWith("/suporte")) return "Suporte";
  if (pathname.startsWith("/perfil")) return "Conta";
  if (pathname.startsWith("/painel")) return "Início";
  return "Painel";
}
