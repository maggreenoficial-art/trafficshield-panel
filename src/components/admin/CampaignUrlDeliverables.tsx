"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

interface CampaignUrlDeliverablesProps {
  campaignUrl: string;
  urlParams: string;
  compact?: boolean;
}

export function CampaignUrlDeliverables({
  campaignUrl,
  urlParams,
  compact = false,
}: CampaignUrlDeliverablesProps) {
  const [copiedField, setCopiedField] = useState<
    "url" | "params" | "full" | null
  >(null);

  const copy = async (value: string, field: "url" | "params" | "full") => {
    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const fullUrl = urlParams ? `${campaignUrl}?${urlParams}` : campaignUrl;

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      <CopyField
        label="URL"
        hint="Link da campanha — cole no campo de destino do anúncio"
        value={campaignUrl}
        copied={copiedField === "url"}
        onCopy={() => copy(campaignUrl, "url")}
      />
      <CopyField
        label="URL PARAMS"
        hint="Parâmetros da campanha — cole no campo de parâmetros do anúncio"
        value={urlParams || "—"}
        copied={copiedField === "params"}
        onCopy={() => urlParams && copy(urlParams, "params")}
        disabled={!urlParams}
      />

      {!compact && (
        <>
          <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-3 text-[10px] text-muted">
            <strong className="text-yellow-400">Importante:</strong> use URL e
            URL PARAMS <strong className="text-white">exatamente como foram gerados</strong>.
            Não altere, remova nem reordene os parâmetros.
          </div>

          <div className="rounded border border-white/10 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] tracking-widest text-muted uppercase">
                URL completa (referência)
              </p>
              <button
                type="button"
                onClick={() => copy(fullUrl, "full")}
                className="flex items-center gap-1 text-[10px] text-muted hover:text-white"
              >
                {copiedField === "full" ? (
                  <Check size={12} className="text-green-400" />
                ) : (
                  <Copy size={12} />
                )}
                {copiedField === "full" ? "Copiado" : "Copiar tudo"}
              </button>
            </div>
            <p className="mt-2 break-all font-mono text-[10px] text-accent">
              {fullUrl}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function CopyField({
  label,
  hint,
  value,
  copied,
  onCopy,
  disabled,
}: {
  label: string;
  hint?: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="rounded border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold tracking-widest text-white uppercase">
            {label}
          </p>
          {hint && <p className="mt-1 text-[10px] text-muted">{hint}</p>}
        </div>
        <button
          type="button"
          onClick={onCopy}
          disabled={disabled}
          className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[10px] text-muted hover:border-accent hover:text-white disabled:opacity-40"
        >
          {copied ? (
            <Check size={12} className="text-green-400" />
          ) : (
            <Copy size={12} />
          )}
          {copied ? "Copiado!" : "Copiar"}
        </button>
      </div>
      <p className="mt-3 break-all rounded border border-white/5 bg-black/40 px-3 py-2.5 font-mono text-xs text-accent">
        {value}
      </p>
    </div>
  );
}
