"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import Shuffle from "@/components/react-bits/Shuffle";

interface NoratLogoProps {
  className?: string;
  priority?: boolean;
  size?: "sm" | "md" | "lg";
  iconClassName?: string;
  textClassName?: string;
}

const sizeConfig = {
  sm: {
    icon: "h-9 w-9 sm:h-10 sm:w-10",
    text: "text-[15px] font-semibold tracking-[0.2em] sm:text-base",
  },
  md: {
    icon: "h-11 w-11 sm:h-12 sm:w-12",
    text: "text-base font-semibold tracking-[0.2em] sm:text-lg",
  },
  lg: {
    icon: "h-16 w-16 sm:h-20 sm:w-20",
    text: "text-2xl font-semibold tracking-[0.22em] sm:text-3xl",
  },
} as const;

export function NoratLogo({
  className,
  priority,
  size = "md",
  iconClassName,
  textClassName,
}: NoratLogoProps) {
  const cfg = sizeConfig[size];

  return (
    <span
      className={cn("inline-flex items-center gap-2 sm:gap-2.5", className)}
      aria-label="norat"
    >
      <Image
        src="/rato.png"
        alt=""
        width={512}
        height={512}
        unoptimized
        priority={priority}
        className={cn(
          "shrink-0 object-contain [image-rendering:pixelated]",
          cfg.icon,
          iconClassName
        )}
      />
      <Shuffle
        text="NORAT"
        tag="span"
        textAlign="left"
        compact
        hideUntilReady={false}
        className={cn("font-sans font-semibold tracking-[0.2em] text-white", cfg.text, textClassName)}
        style={{ color: "#ffffff" }}
        shuffleDirection="right"
        duration={0.35}
        animationMode="evenodd"
        shuffleTimes={1}
        stagger={0.04}
        ease="power3.out"
        colorTo="#ffffff"
        playOnMount
        triggerOnce
        triggerOnHover
        respectReducedMotion
      />
    </span>
  );
}
