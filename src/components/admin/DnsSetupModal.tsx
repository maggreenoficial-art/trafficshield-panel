"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { getCampaignSubdomainLabel } from "@/lib/traffic-shield/campaign-hostname";

export interface DnsRecordInstruction {
  type: "CNAME";
  name: string;
  target: string;
  ttl: string;
  hostname: string;
}

interface DnsSetupModalProps {
  instructions: DnsRecordInstruction;
  originUrl?: string | null;
  onClose: () => void;
  onValidate?: () => void;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] py-3 last:border-0">
      <div>
        <p className="text-sm text-white/40">{label}</p>
        <p className="mt-1 font-mono text-sm text-accent">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex shrink-0 items-center gap-1 rounded border border-white/[0.06] px-2.5 py-1.5 text-sm text-muted hover:border-accent hover:text-white"
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export function DnsSetupModal({
  instructions,
  originUrl,
  onClose,
  onValidate,
}: DnsSetupModalProps) {
  const subLabel = getCampaignSubdomainLabel(instructions.hostname);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/[0.06] bg-black p-6">
        <p className="text-xs tracking-[0.2em] text-white/35 uppercase">
          Passo 2 de 4 — DNS
        </p>
        <h3 className="mt-2 text-lg font-medium">CNAME do subdomínio de campanha</h3>
        <p className="mt-2 text-sm text-muted">
          Crie um registro <strong className="text-white">novo</strong> no DNS de{" "}
          <strong className="text-white">{instructions.hostname}</strong>. O{" "}
          <code className="text-accent">www</code> e o domínio raiz{" "}
          <strong className="text-white">não mudam</strong> — o site continua no ar.
        </p>

        <div className="mt-4 rounded border border-green-500/20 bg-green-500/5 p-3 text-sm text-muted">
          <strong className="text-green-400">Modelo correto (como cloakers de mercado):</strong>
          <p className="mt-1">
            <code className="text-accent">{subLabel}</code> → norat ·{" "}
            <code className="text-accent">www</code> → site (intocado)
          </p>
          <p className="mt-2">
            URL do anúncio:{" "}
            <code className="text-accent">
              https://{instructions.hostname}/c/sua-campanha
            </code>
          </p>
        </div>

        <div className="mt-6 border border-white/[0.06] bg-white/[0.02] px-4">
          <CopyField label="Tipo" value={instructions.type} />
          <CopyField label="Nome (subdomínio)" value={instructions.name} />
          <CopyField label="Destino (edge norat)" value={instructions.target} />
          <CopyField label="TTL" value={instructions.ttl} />
        </div>

        <div className="mt-4 rounded border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-muted">
          <p>
            <strong className="text-white">Edge norat:</strong>{" "}
            <code className="text-accent">{instructions.target}</code>
          </p>
          <p className="mt-2">
            Na Vercel → projeto norat → <em>Settings → Domains</em>, adicione{" "}
            <strong className="text-white">{instructions.hostname}</strong> para SSL
            funcionar.
          </p>
          {originUrl ? (
            <p className="mt-2">
              Proxy de origem (opcional):{" "}
              <code className="text-accent">{originUrl}</code>
            </p>
          ) : null}
        </div>

        <div className="mt-4 rounded border border-yellow-500/20 bg-yellow-500/5 p-3 text-sm text-muted">
          <strong className="text-yellow-400">Validação estrita:</strong> só fica
          &quot;Valid&quot; quando o CNAME de <code className="text-accent">{instructions.name}</code>{" "}
          apontar para <code className="text-accent">{instructions.target}</code> — não
          basta o site principal estar no ar.
        </div>

        <div className="mt-6 flex gap-3">
          {onValidate && (
            <button
              type="button"
              onClick={onValidate}
              className="flex-1 panel-pill-btn w-full"
            >
              Validar DNS agora
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border border-white/20 px-5 py-2.5 text-sm text-muted hover:text-white ${onValidate ? "" : "flex-1"}`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
