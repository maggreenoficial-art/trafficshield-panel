"use client";

import { cn } from "@/lib/utils";
import { DecryptedText } from "@/components/react-bits";

interface NoratHighlightProps {
  className?: string;
}

export function NoratHighlight({ className }: NoratHighlightProps) {
  return (
    <DecryptedText
      text="norat"
      animateOn="hover"
      sequential
      speed={35}
      useOriginalCharsOnly
      className={cn("font-semibold text-accent", className)}
      encryptedClassName="text-accent/35"
      parentClassName="!inline whitespace-normal"
    />
  );
}
