"use client";

import { OFFER_NICHE_IDS, OFFER_NICHE_LABELS, type OfferNicheId } from "@/lib/offers/niche";
import type { OfferKeywordHint } from "@/lib/offers/keywords";
import { cn } from "@/lib/utils";

export function OfferKeywordChips(props: {
  items: OfferKeywordHint[];
  active?: string;
  onPick: (phrase: string) => void;
}) {
  const groups = OFFER_NICHE_IDS.map((id) => ({
    id,
    items: props.items.filter((item) => item.niche === id),
  })).filter((group) => group.items.length);
  const leftover = props.items.filter(
    (item) => !OFFER_NICHE_IDS.includes(item.niche as OfferNicheId)
  );
  if (leftover.length) {
    groups.push({ id: leftover[0].niche, items: leftover });
  }
  if (!groups.length) return null;
  const activeKey = (props.active ?? "").trim().toLowerCase();
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <div key={group.id}>
          <p className="text-[11px] uppercase tracking-wide text-white/35">
            {OFFER_NICHE_LABELS[group.id] ?? group.id}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {group.items.map((item) => {
              const on = item.phrase.trim().toLowerCase() === activeKey;
              return (
                <button
                  key={`${group.id}-${item.phrase}`}
                  type="button"
                  title={item.why || item.phrase}
                  onClick={() => props.onPick(item.phrase)}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[11px] transition-colors",
                    on
                      ? "bg-violet-500 text-black"
                      : "bg-white/8 text-white/70 hover:bg-white/12 hover:text-white"
                  )}
                >
                  {item.phrase}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
