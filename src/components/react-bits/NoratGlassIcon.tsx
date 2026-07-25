"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const gradientMapping: Record<string, string> = {
  blue: "linear-gradient(hsl(223, 90%, 50%), hsl(208, 90%, 50%))",
  purple: "linear-gradient(hsl(283, 90%, 50%), hsl(268, 90%, 50%))",
  red: "linear-gradient(hsl(3, 90%, 50%), hsl(348, 90%, 50%))",
  indigo: "linear-gradient(hsl(253, 90%, 50%), hsl(238, 90%, 50%))",
  orange: "linear-gradient(hsl(43, 90%, 50%), hsl(28, 90%, 50%))",
  green: "linear-gradient(hsl(123, 90%, 40%), hsl(108, 90%, 40%))",
  accent: "linear-gradient(hsl(43, 96%, 56%), hsl(38, 92%, 50%))",
};

type NoratGlassIconProps = {
  icon: LucideIcon;
  color?: string;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
  iconClassName?: string;
};

const sizeMap = {
  sm: { box: "h-8 w-8", icon: 14, radius: "rounded-lg" },
  md: { box: "h-10 w-10", icon: 18, radius: "rounded-xl" },
  lg: { box: "h-14 w-14", icon: 22, radius: "rounded-2xl" },
} as const;

export function NoratGlassIcon({
  icon: Icon,
  color = "accent",
  size = "md",
  label,
  className,
  iconClassName,
}: NoratGlassIconProps) {
  const dims = sizeMap[size];
  const background =
    gradientMapping[color] ?? gradientMapping.accent;

  return (
    <span
      className={cn(
        "group relative inline-flex shrink-0 [perspective:24em] [transform-style:preserve-3d]",
        dims.box,
        className
      )}
      aria-hidden={!label}
      aria-label={label}
    >
      <span
        className={cn(
          "absolute inset-0 block rotate-[12deg] transition-transform duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:rotate-[18deg] group-hover:translate-x-[-2px] group-hover:translate-y-[-2px]",
          dims.radius
        )}
        style={{
          background,
          boxShadow: "0.35em -0.35em 0.5em hsla(0, 0%, 0%, 0.35)",
        }}
      />
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center bg-white/15 backdrop-blur-md transition-transform duration-300 ease-[cubic-bezier(0.83,0,0.17,1)] group-hover:translate-z-[4px]",
          dims.radius
        )}
        style={{
          boxShadow: "0 0 0 1px hsla(0, 0%, 100%, 0.22) inset",
        }}
      >
        <Icon
          size={dims.icon}
          strokeWidth={2}
          className={cn("text-white", iconClassName)}
        />
      </span>
    </span>
  );
}
