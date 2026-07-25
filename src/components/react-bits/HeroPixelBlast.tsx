"use client";

import dynamic from "next/dynamic";

const PixelBlast = dynamic(() => import("@/components/react-bits/PixelBlast"), {
  ssr: false,
});

export function HeroPixelBlast() {
  return (
    <PixelBlast
      color="#fbbf24"
      variant="square"
      pixelSize={4}
      patternScale={2.2}
      patternDensity={1.25}
      liquid
      liquidStrength={0.09}
      liquidRadius={1.2}
      transparent
      edgeFade={0.35}
      speed={0.45}
      enableRipples
      rippleIntensityScale={1.4}
      className="h-full w-full"
    />
  );
}
