"use client";

import type { ReactNode } from "react";
import {
  FeatureCard,
  FeatureCardDescription,
  FeatureCardTitle,
} from "@/components/ui/feature-card";
import {
  GoogleAdsLogo,
  MetaIconOutline,
  MgidLogo,
  NewsBreakLogo,
  RumbleLogo,
  TaboolaLogo,
  TikTokLogo,
} from "@/components/ui/platform-logos";
import { cn } from "@/lib/utils";

type PlatformItem = {
  id: string;
  variant: "icon" | "wordmark";
  node: ReactNode;
};

const platforms: PlatformItem[] = [
  {
    id: "meta",
    variant: "icon",
    node: <MetaIconOutline className="h-4 w-4 opacity-80" />,
  },
  {
    id: "google",
    variant: "icon",
    node: <GoogleAdsLogo className="h-4 w-4 opacity-90" />,
  },
  {
    id: "tiktok",
    variant: "icon",
    node: <TikTokLogo className="h-4 w-4 text-white/55" />,
  },
  {
    id: "taboola",
    variant: "wordmark",
    node: <TaboolaLogo />,
  },
  {
    id: "mgid",
    variant: "wordmark",
    node: <MgidLogo />,
  },
  {
    id: "rumble",
    variant: "wordmark",
    node: <RumbleLogo />,
  },
  {
    id: "newsbreak",
    variant: "wordmark",
    node: <NewsBreakLogo />,
  },
];

function PlatformChip({
  variant,
  children,
}: {
  variant: PlatformItem["variant"];
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-9 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.02]",
        variant === "icon" ? "w-9" : "min-h-9 px-3.5"
      )}
    >
      {children}
    </div>
  );
}

export function PlatformsShowcaseCard() {
  return (
    <FeatureCard className="mx-auto max-w-2xl">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {platforms.map((platform) => (
          <PlatformChip key={platform.id} variant={platform.variant}>
            {platform.node}
          </PlatformChip>
        ))}
      </div>
      <FeatureCardTitle>Compatível com as principais fontes</FeatureCardTitle>
      <FeatureCardDescription className="mt-1.5">
        Meta Ads, Google Ads, TikTok, Taboola, MGID, Rumble e NewsBreak — parâmetros
        e filtros gerados automaticamente para cada plataforma.
      </FeatureCardDescription>
    </FeatureCard>
  );
}
