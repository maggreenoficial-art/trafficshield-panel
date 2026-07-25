import Image from "next/image";
import { cn } from "@/lib/utils";

interface NoratHeaderMarkProps {
  className?: string;
  priority?: boolean;
}

export function NoratHeaderMark({ className, priority }: NoratHeaderMarkProps) {
  return (
    <span
      className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center overflow-visible sm:h-12 sm:w-12",
        className
      )}
    >
      <Image
        src="/imgheader.png"
        alt="norat"
        width={512}
        height={512}
        unoptimized
        priority={priority}
        className="max-h-full max-w-full object-contain object-center [image-rendering:pixelated]"
      />
    </span>
  );
}
