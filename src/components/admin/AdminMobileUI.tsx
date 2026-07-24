import { cn } from "@/lib/utils";

export function AdminScrollTabs({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div className={cn("flex min-w-max gap-1 border-b border-white/10", className)}>
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
      <h1 className="font-serif text-2xl italic sm:text-3xl">{title}</h1>
      {subtitle && (
        <p className="mt-1 text-xs text-muted sm:text-sm">{subtitle}</p>
      )}
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
      <p className="text-[10px] text-muted sm:hidden">
        Deslize horizontalmente para ver todas as colunas →
      </p>
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <div style={{ minWidth }}>{children}</div>
      </div>
    </div>
  );
}
