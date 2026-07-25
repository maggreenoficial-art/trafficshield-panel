/** Tokens visuais do painel — tipografia legível */

export const panelCard =
  "rounded-lg border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/10";

export const panelCardPadded = `${panelCard} p-4 sm:p-5`;

export const panelTitle =
  "text-xl font-medium tracking-tight text-white/85 sm:text-2xl";

export const panelSubtitle =
  "mt-1.5 text-sm leading-relaxed text-white/45 sm:text-base";

export const panelLabel = "mb-1.5 block text-sm text-white/45";

export const panelSectionTitle =
  "text-xs font-medium tracking-[0.15em] text-white/40 uppercase";

export const panelBody = "text-sm leading-relaxed text-white/50 sm:text-[15px]";

export const panelBodySmall = "text-xs leading-relaxed text-white/45 sm:text-sm";

export const panelInput =
  "w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-base text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/15";

export const panelSearch =
  "flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-sm";

export const panelPillBtn =
  "rounded-full px-4 py-2 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

export const panelNavItem = (active: boolean) =>
  active
    ? "rounded-full bg-white/[0.06] text-white"
    : "text-white/55 hover:bg-white/[0.04] hover:text-white/80";

export const panelTableWrap =
  "overflow-x-auto rounded-lg border border-white/[0.06] text-sm";

export const panelTableHead =
  "border-b border-white/[0.06] bg-white/[0.02] text-sm text-white/45";

export const panelMenu =
  "absolute right-4 top-12 z-20 min-w-[160px] rounded-lg border border-white/[0.06] bg-black/95 py-1 shadow-xl backdrop-blur-md";

export const panelMenuItem =
  "flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/65 transition-colors hover:bg-white/[0.04] hover:text-white";

export const panelBadge =
  "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium sm:text-sm";

export const panelMono = "font-mono text-xs text-muted sm:text-sm";
