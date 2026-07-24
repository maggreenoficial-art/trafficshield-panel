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
  originUrl,
  onClose,
  onValidate,
}: DnsSetupModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-white/10 bg-black p-6">
        <p className="text-[10px] tracking-widest text-accent uppercase">
          Passo 2 de 4
        </p>
        <h3 className="mt-2 text-lg font-medium">Aponte o domínio para o norat</h3>
        <p className="mt-2 text-xs text-muted">
          No painel DNS de{" "}
          <strong className="text-white">{instructions.hostname}</strong>,{" "}
          <strong className="text-white">edite</strong> o CNAME existente (não crie
          outro no mesmo nome) ou crie o registro abaixo.
        </p>

        <div className="mt-4 rounded border border-green-500/20 bg-green-500/5 p-3 text-[10px] text-muted">
          <strong className="text-green-400">Seu site não sai do ar.</strong> O norat
          intercepta apenas <code className="text-accent">/c/*</code> (campanhas). Todo
          o resto é repassado para a origem:
          {originUrl ? (
            <span className="mt-1 block font-mono text-accent">{originUrl}</span>
          ) : null}
        </div>

        <div className="mt-6 border border-white/10 bg-white/[0.02] px-4">
          <CopyField label="Tipo" value={instructions.type} />
          <CopyField label="Nome" value={instructions.name} />
          <CopyField label="Destino" value={instructions.target} />
          <CopyField label="TTL" value={instructions.ttl} />
        </div>

        <div className="mt-4 space-y-2 rounded border border-white/10 bg-white/[0.02] p-3 text-[10px] text-muted">
          <p>
            <strong className="text-white">Exemplo radario.sbs:</strong> se o{" "}
            <code className="text-accent">www</code> hoje aponta para{" "}
            <code className="text-accent">xxx.vercel-dns.com</code>, troque só o
            destino para <code className="text-accent">{instructions.target}</code> e
            use essa URL Vercel como origem no cadastro.
          </p>
          <p>
            Visitantes normais → site original · Anúncios em{" "}
            <code className="text-accent">/c/slug</code> → cloaker norat.
          </p>
        </div>

        <div className="mt-4 rounded border border-yellow-500/20 bg-yellow-500/5 p-3 text-[10px] text-muted">
          <strong className="text-yellow-400">Propagação:</strong> pode levar de
          minutos até 48h. Depois clique em{" "}
          <strong className="text-white">Validar DNS agora</strong>.
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
