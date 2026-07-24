import Image from "next/image";
import { cn } from "@/lib/utils";

interface NoratLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  wordmarkClassName?: string;
}

export function NoratLogo({
  size = 32,
  showWordmark = false,
  className,
  wordmarkClassName,
}: NoratLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/norat-logo.png"
        alt="norat"
        width={size}
        height={size}
        className="rounded-lg object-cover"
        priority
      />
      {showWordmark && (
        <span className={cn("font-semibold tracking-tight", wordmarkClassName)}>
          norat
        </span>
      )}
    </span>
  );
}
