"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function FeatureCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:border-white/10 sm:p-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FeatureCardTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={cn("text-sm font-medium text-white/75", className)}>
      {children}
    </h3>
  );
}

export function FeatureCardDescription({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-xs leading-relaxed text-white/40", className)}>
      {children}
    </p>
  );
}

export function FeatureCardSkeleton({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "relative mb-3 overflow-hidden rounded-md border border-white/[0.04] bg-white/[0.015]",
        className
      )}
    >
      {children}
    </div>
  );
}

export function FeatureCardOrb({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.03]",
        className
      )}
    >
      {children}
    </div>
  );
}
