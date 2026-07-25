import { cn } from "@/lib/utils";

export function MetaIconOutline({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 287.56 191"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient
          id="meta-linear-gradient"
          x1="62.34"
          y1="101.45"
          x2="260.34"
          y2="91.45"
          gradientTransform="matrix(1, 0, 0, -1, 0, 192)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0064e1" />
          <stop offset="0.4" stopColor="#0064e1" />
          <stop offset="0.83" stopColor="#0073ee" />
          <stop offset="1" stopColor="#0082fb" />
        </linearGradient>
        <linearGradient
          id="meta-linear-gradient-2"
          x1="41.42"
          y1="53"
          x2="41.42"
          y2="126"
          gradientTransform="matrix(1, 0, 0, -1, 0, 192)"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#0082fb" />
          <stop offset="1" stopColor="#0064e0" />
        </linearGradient>
      </defs>
      <path
        fill="#0081fb"
        d="M31.06,126c0,11,2.41,19.41,5.56,24.51A19,19,0,0,0,53.19,160c8.1,0,15.51-2,29.79-21.76,11.44-15.83,24.92-38,34-52l15.36-23.6c10.67-16.39,23-34.61,37.18-47C181.07,5.6,193.54,0,206.09,0c21.07,0,41.14,12.21,56.5,35.11,16.81,25.08,25,56.67,25,89.27,0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191V160c17.63,0,22-16.2,22-34.74,0-26.42-6.16-55.74-19.73-76.69-9.63-14.86-22.11-23.94-35.84-23.94-14.85,0-26.8,11.2-40.23,31.17-7.14,10.61-14.47,23.54-22.7,38.13l-9.06,16c-18.2,32.27-22.81,39.62-31.91,51.75C84.74,183,71.12,191,53.19,191c-21.27,0-34.72-9.21-43-23.09C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z"
      />
      <path
        fill="url(#meta-linear-gradient)"
        d="M24.49,37.3C38.73,15.35,59.28,0,82.85,0c13.65,0,27.22,4,41.39,15.61,15.5,12.65,32,33.48,52.63,67.81l7.39,12.32c17.84,29.72,28,45,33.93,52.22,7.64,9.26,13,12,19.94,12,17.63,0,22-16.2,22-34.74l27.4-.86c0,19.38-3.82,33.62-10.32,44.87C271,180.13,258.72,191,238.13,191c-12.8,0-24.14-2.78-36.68-14.61-9.64-9.08-20.91-25.21-29.58-39.71L146.08,93.6c-12.94-21.62-24.81-37.74-31.68-45C107,40.71,97.51,31.23,82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78Z"
      />
      <path
        fill="url(#meta-linear-gradient-2)"
        d="M82.35,31.23c-12.27,0-22.69,8.61-31.41,21.78C38.61,71.62,31.06,99.34,31.06,126c0,11,2.41,19.41,5.56,24.51L10.14,167.91C3.34,156.6,0,141.76,0,124.85,0,94.1,8.44,62.05,24.49,37.3,38.73,15.35,59.28,0,82.85,0Z"
      />
    </svg>
  );
}

export function GoogleAdsLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2L2 19h6.5l3.5-6 3.5 6H22L12 2z" fill="#34A853" />
      <path d="M12 2l4 7H8l4-7z" fill="#FBBC04" />
      <path d="M8 9h8l-2 3.5H6L8 9z" fill="#4285F4" />
    </svg>
  );
}

export function TikTokLogo({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1v-3.5a6.37 6.37 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.77 1.52V6.76a4.85 4.85 0 0 1-1-.07z" />
    </svg>
  );
}

export function TaboolaLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap text-[11px] font-semibold lowercase leading-none tracking-tight text-[#4B8BFF]",
        className
      )}
      aria-hidden
    >
      taboola
    </span>
  );
}

export function MgidLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap text-[11px] font-bold uppercase leading-none tracking-[0.08em] text-[#00B956]",
        className
      )}
      aria-hidden
    >
      MGID
    </span>
  );
}

export function RumbleLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap leading-none", className)}
      aria-hidden
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-[#85C742]">
        <svg viewBox="0 0 8 8" className="h-2 w-2 fill-black" aria-hidden>
          <path d="M2.5 1.5v5l4-2.5-4-2.5z" />
        </svg>
      </span>
      <span className="text-[10px] font-bold uppercase tracking-[0.06em] text-[#85C742]">
        Rumble
      </span>
    </span>
  );
}

export function NewsBreakLogo({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 whitespace-nowrap leading-none", className)}
      aria-hidden
    >
      <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] bg-[#FF3B30] text-[8px] font-bold text-white">
        N
      </span>
      <span className="text-[10px] font-bold tracking-tight text-[#FF3B30]">
        NewsBreak
      </span>
    </span>
  );
}
