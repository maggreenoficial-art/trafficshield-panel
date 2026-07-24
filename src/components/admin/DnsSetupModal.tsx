"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export interface DnsRecordInstruction {
  type: "CNAME";
  name: string;
  target: string;
  ttl: string;
  hostname: string;
}

interface DnsSetupModalProps {
  instructions: DnsRecordInstruction;
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
    <div className="flex items-center justify-between gap-3 border-b border-white/10 py-3 last:border-0">
      <div>
        <p className="text-[10px] tracking-widest text-muted uppercase">{label}</p>
        <p className="mt-1 font-mono text-sm text-accent">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="flex shrink-0 items-center gap-1 rounded border border-white/10 px-2.5 py-1.5 text-[10px] text-muted hover:border-accent hover:text-white"
      >
        {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

export function DnsSetupModal({
  instructions,
  onClose,
  onValidate,
}: DnsSetupModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-black p-6">
        <p className="text-[10px] tracking-widest text-accent uppercase">
          Passo 2 de 4
        </p>
        <h3 className="mt-2 text-lg font-medium">Crie o registro CNAME no painel de DNS</h3>
        <p className="mt-2 text-xs text-muted">
          No painel de DNS do provedor onde você registrou o domínio{" "}
          <strong className="text-white">{instructions.hostname}</strong>, crie um
          novo registro com os valores abaixo (ex.: Hostinger, Registro.br, Cloudflare).
        </p>

        <div className="mt-6 border border-white/10 bg-white/[0.02] px-4">
          <CopyField label="Tipo" value={instructions.type} />
          <CopyField label="Nome" value={instructions.name} />
          <CopyField label="Destino" value={instructions.target} />
          <CopyField label="TTL" value={instructions.ttl} />
        </div>

        <div className="mt-4 rounded border border-yellow-500/20 bg-yellow-500/5 p-3 text-[10px] text-muted">
          <strong className="text-yellow-400">Importante:</strong> salve o registro no
          painel do seu provedor. A propagação DNS pode levar de alguns minutos até 48
          horas. Depois, volte aqui e clique em <strong className="text-white">Validar</strong>.
        </div>

        <div className="mt-6 flex gap-3">
          {onValidate && (
            <button
              type="button"
              onClick={onValidate}
              className="flex-1 rounded-full bg-white py-2.5 text-xs font-semibold text-black hover:bg-accent"
            >
              Validar DNS agora
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className={`rounded-full border border-white/20 px-5 py-2.5 text-xs text-muted hover:text-white ${onValidate ? "" : "flex-1"}`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
