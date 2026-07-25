/** Tokens visuais do painel — alinhados à landing minimalista */

export const panelCard =
  "rounded-lg border border-white/[0.06] bg-white/[0.02] transition-colors hover:border-white/10";

export const panelCardPadded = `${panelCard} p-4 sm:p-5`;

export const panelTitle = "text-lg font-medium tracking-tight text-white/85 sm:text-xl";

export const panelSubtitle = "mt-1 text-xs leading-relaxed text-white/40 sm:text-sm";

export const panelLabel = "mb-1.5 block text-xs text-white/40";

export const panelSectionTitle =
  "text-[10px] tracking-[0.2em] text-white/35 uppercase";

export const panelInput =
  "w-full rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/15";

export const panelSearch =
  "flex items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-4 py-3";

export const panelPillBtn =
  "rounded-full px-4 py-2 text-[13px] text-white/55 transition-colors hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40";

export const panelNavItem = (active: boolean) =>
  active
    ? "rounded-full bg-white/[0.06] text-white"
    : "text-white/55 hover:bg-white/[0.04] hover:text-white/80";

export const panelTableWrap =
  "overflow-x-auto rounded-lg border border-white/[0.06]";

export const panelTableHead =
  "border-b border-white/[0.06] bg-white/[0.02] text-white/40";

export const panelMenu =
  "absolute right-4 top-12 z-20 min-w-[140px] rounded-lg border border-white/[0.06] bg-black/95 py-1 shadow-xl backdrop-blur-md";

export const panelMenuItem =
  "flex w-full items-center gap-2 px-4 py-2 text-left text-xs text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white";
