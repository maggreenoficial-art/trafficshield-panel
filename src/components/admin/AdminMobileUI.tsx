import { cn } from "@/lib/utils";
import {
  panelSectionTitle,
  panelSubtitle,
  panelTableWrap,
  panelTitle,
} from "@/lib/panel-styles";

export function AdminScrollTabs({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div
        className={cn(
          "landing-nav-pill flex min-w-max gap-0.5 rounded-full p-1",
          className
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function AdminPageTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="min-w-0">
      <p className={panelSectionTitle}>Painel</p>
      <h1 className={panelTitle}>{title}</h1>
      {subtitle && <p className={panelSubtitle}>{subtitle}</p>}
    </div>
  );
}

export function AdminTableWrap({
  children,
  minWidth = 720,
}: {
  children: React.ReactNode;
  minWidth?: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-white/40 sm:hidden">
        Deslize horizontalmente para ver todas as colunas →
      </p>
      <div className={panelTableWrap}>
        <div style={{ minWidth }}>{children}</div>
      </div>
    </div>
  );
}
