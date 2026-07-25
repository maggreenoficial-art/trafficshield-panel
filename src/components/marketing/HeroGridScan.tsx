"use client";

import dynamic from "next/dynamic";

const GridScan = dynamic(
  () =>
    import("@/components/react-bits/GridScan").then((mod) => ({
      default: mod.GridScan,
    })),
  { ssr: false }
);

export function HeroGridScan() {
  return (
    <GridScan
      sensitivity={0.55}
      lineThickness={1}
      linesColor="#1f1f1f"
      gridScale={0.1}
      scanColor="#fbbf24"
      scanOpacity={0.35}
      lineJitter={0.06}
      enablePost
      bloomIntensity={0.35}
      chromaticAberration={0.002}
      noiseIntensity={0.01}
      scanGlow={0.55}
      scanDuration={2.2}
      scanDelay={1.8}
      scanOnClick
      className="h-full w-full"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
