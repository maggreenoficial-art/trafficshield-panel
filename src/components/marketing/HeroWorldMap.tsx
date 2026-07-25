"use client";

import dynamic from "next/dynamic";

const WorldMap = dynamic(() => import("@/components/ui/world-map"), {
  ssr: false,
});

/** Rotas de tráfego pago — hubs de mídia e operações LATAM */
export const noratWorldRoutes = [
  {
    start: { lat: -23.5505, lng: -46.6333 },
    end: { lat: 40.7128, lng: -74.006 },
  },
  {
    start: { lat: -15.7975, lng: -47.8919 },
    end: { lat: 34.0522, lng: -118.2437 },
  },
  {
    start: { lat: -23.5505, lng: -46.6333 },
    end: { lat: 51.5074, lng: -0.1278 },
  },
  {
    start: { lat: -15.7975, lng: -47.8919 },
    end: { lat: 25.2048, lng: 55.2708 },
  },
  {
    start: { lat: -23.5505, lng: -46.6333 },
    end: { lat: 35.6762, lng: 139.6503 },
  },
  {
    start: { lat: 51.5074, lng: -0.1278 },
    end: { lat: -23.5505, lng: -46.6333 },
  },
] as const;

export function HeroWorldMap() {
  return (
    <WorldMap
      dots={[...noratWorldRoutes]}
      lineColor="#fbbf24"
      className="opacity-75"
    />
  );
}
