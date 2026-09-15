"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export function CopyNameButton({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const [ok, setOk] = useState(false);

  async function copy(e: React.MouseEvent) {
    e.stopPropagation();
    if (!name || name === "—") return;
    try {
      await navigator.clipboard.writeText(name);
      setOk(true);
      window.setTimeout(() => setOk(false), 1400);
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      title="Copiar nome para o Gerenciador"
      onClick={(e) => void copy(e)}
      className={cn(
        "inline-flex shrink-0 items-center rounded-md p-1 text-white/35 hover:bg-white/10 hover:text-sky-200",
        className
      )}
    >
      {ok ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
    </button>
  );
}
