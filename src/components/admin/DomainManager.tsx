"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Globe,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  XCircle,
  Clock,
} from "lucide-react";
import type { TrafficDomain } from "@/lib/traffic-shield/campaign-types";
import {
  DnsSetupModal,
  type DnsRecordInstruction,
} from "@/components/admin/DnsSetupModal";

export function DomainManager() {
  const [domains, setDomains] = useState<TrafficDomain[]>([]);
  const [slots, setSlots] = useState({ used: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [dnsModal, setDnsModal] = useState<{
    instructions: DnsRecordInstruction;
    domainId?: string;
  } | null>(null);
  const [cnameTarget, setCnameTarget] = useState("");
  const [hostname, setHostname] = useState("");
  const [label, setLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/traffic/domains");
    const json = await res.json();
    setDomains(json.domains ?? []);
    setSlots(json.slots ?? { used: 0, limit: 10 });
    setCnameTarget(json.dns?.cnameTarget ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return domains;
    return domains.filter(
      (d) =>
        d.hostname.includes(q) ||
        d.label?.toLowerCase().includes(q)
    );
  }, [domains, search]);

  const handleAdd = async () => {
    setSaving(true);
    setError("");
    const res = await fetch("/api/admin/traffic/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hostname, label: label || undefined }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Erro ao cadastrar.");
      setSaving(false);
      return;
    }
    setShowModal(false);
    setHostname("");
    setLabel("");
    setSaving(false);
    if (json.dnsInstructions) {
      setDnsModal({
        instructions: json.dnsInstructions,
        domainId: json.domain?.id,
      });
    }
    await load();
  };

  const openDnsModal = async (domainId: string) => {
    setMenuOpen(null);
    const res = await fetch(`/api/admin/traffic/domains/${domainId}`);
    const json = await res.json();
    if (json.dnsInstructions) {
      setDnsModal({ instructions: json.dnsInstructions, domainId });
    }
  };

  const handleDnsValidate = async () => {
    if (!dnsModal?.domainId) return;
    await handleValidate(dnsModal.domainId);
    setDnsModal(null);
  };

  const handleValidate = async (id: string) => {
    setMenuOpen(null);
    await fetch(`/api/admin/traffic/domains/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "validate" }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    setMenuOpen(null);
    if (!confirm("Excluir este domínio? Campanhas vinculadas ficarão sem domínio.")) return;
    await fetch(`/api/admin/traffic/domains/${id}`, { method: "DELETE" });
    await load();
  };

  const handleSetPrimary = async (id: string) => {
    setMenuOpen(null);
    await fetch(`/api/admin/traffic/domains/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_primary" }),
    });
    await load();
  };

  const slotPercent = slots.limit > 0 ? (slots.used / slots.limit) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-2xl italic">Domínios</h2>
          <p className="mt-1 text-sm text-muted">
            Cadastre os domínios usados nas URLs das campanhas protegidas
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          disabled={slots.used >= slots.limit}
          className="flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-accent disabled:opacity-40"
        >
          <Plus size={14} />
          Adicionar domínio
        </button>
      </div>

      <div className="border border-white/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] tracking-widest text-muted uppercase">
              Domain slots
            </p>
            <p className="mt-1 text-sm">
              <span className="text-accent">{slots.used}</span>
              <span className="text-muted"> de {slots.limit} slots usados</span>
            </p>
          </div>
          <div className="h-2 w-48 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{ width: `${Math.min(100, slotPercent)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border border-white/10 px-4 py-3">
        <Search size={16} className="text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar domínio..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <button onClick={load} className="text-muted hover:text-white">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="overflow-x-auto border border-white/10">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-muted">
              <th className="px-4 py-3 font-medium">Domínio</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium text-center">Campanhas</th>
              <th className="px-4 py-3 font-medium text-center text-accent">Offer</th>
              <th className="px-4 py-3 font-medium text-center text-green-400">Safe</th>
              <th className="px-4 py-3 font-medium text-center text-orange-400">Bots</th>
              <th className="px-4 py-3 font-medium">Última verificação</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
                  <Loader2 className="mx-auto animate-spin text-accent" size={24} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-muted">
                  <Globe size={32} className="mx-auto mb-3 opacity-30" />
                  Nenhum domínio cadastrado.
                  <br />
                  Clique em &quot;Adicionar domínio&quot; para começar.
                </td>
              </tr>
            ) : (
              filtered.map((domain) => (
                <tr
                  key={domain.id}
                  className="border-b border-white/5 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-4">
                    <p className="font-medium">{domain.hostname}</p>
                    {domain.label && (
                      <p className="mt-0.5 text-[10px] text-muted">{domain.label}</p>
                    )}
                    {domain.isPrimary && (
                      <span className="mt-1 inline-block text-[10px] text-accent">
                        ★ Principal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={domain.status} />
                    {domain.validationMessage && (
                      <p className="mt-1 max-w-[180px] text-[10px] text-muted line-clamp-2">
                        {domain.validationMessage}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">{domain.campaignCount ?? 0}</td>
                  <td className="px-4 py-4 text-center text-accent">
                    {domain.clicksOffer ?? 0}
                  </td>
                  <td className="px-4 py-4 text-center text-green-400">
                    {domain.clicksSafe ?? 0}
                  </td>
                  <td className="px-4 py-4 text-center text-orange-400">
                    {domain.clicksBots ?? 0}
                  </td>
                  <td className="px-4 py-4 text-muted">
                    {domain.lastCheckedAt
                      ? new Date(domain.lastCheckedAt).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "—"}
                  </td>
                  <td className="relative px-4 py-4">
                    <button
                      onClick={() =>
                        setMenuOpen(menuOpen === domain.id ? null : domain.id)
                      }
                      className="text-muted hover:text-white"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {menuOpen === domain.id && (
                      <div className="absolute right-4 top-12 z-20 min-w-[160px] border border-white/10 bg-black py-1 shadow-xl">
                        <button
                          onClick={() => openDnsModal(domain.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/5"
                        >
                          <Globe size={12} /> Configurar DNS
                        </button>
                        <button
                          onClick={() => handleValidate(domain.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/5"
                        >
                          <RefreshCw size={12} /> Validar
                        </button>
                        {!domain.isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(domain.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/5"
                          >
                            ★ Tornar principal
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(domain.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-red-500/10"
                        >
                          <Trash2 size={12} /> Excluir
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md border border-white/10 bg-black p-6">
            <h3 className="text-lg font-medium">Adicionar domínio</h3>
            <p className="mt-2 text-xs text-muted">
              Informe o domínio que será usado nas URLs das campanhas (ex:{" "}
              <code className="text-accent">www.seudominio.com.br</code>).
              Apenas o domínio da campanha precisa estar cadastrado.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-[10px] tracking-widest text-muted uppercase">
                  Domínio
                </label>
                <input
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="www.seudominio.com.br"
                  className="w-full border-b border-white/20 bg-transparent py-2.5 text-sm outline-none focus:border-accent"
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-2 block text-[10px] tracking-widest text-muted uppercase">
                  Apelido (opcional)
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Loja principal"
                  className="w-full border-b border-white/20 bg-transparent py-2.5 text-sm outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="mt-4 rounded border border-white/10 bg-white/5 p-3 text-[10px] text-muted">
              <strong className="text-white">Como funciona:</strong>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Cadastre o domínio aqui</li>
                <li>Crie o CNAME no painel DNS do provedor</li>
                <li>Clique em Validar no menu ⋯</li>
                <li>Use o domínio ao criar campanhas</li>
              </ol>
              {cnameTarget && (
                <p className="mt-2 text-accent">
                  Destino CNAME: <code>{cnameTarget}</code>
                </p>
              )}
            </div>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAdd}
                disabled={saving || !hostname.trim()}
                className="flex-1 rounded-full bg-white py-2.5 text-xs font-semibold text-black hover:bg-accent disabled:opacity-40"
              >
                {saving ? "Salvando..." : "Cadastrar domínio"}
              </button>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError("");
                }}
                className="px-4 text-xs text-muted hover:text-white"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {dnsModal && (
        <DnsSetupModal
          instructions={dnsModal.instructions}
          onClose={() => setDnsModal(null)}
          onValidate={dnsModal.domainId ? handleDnsValidate : undefined}
        />
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; className: string; icon: typeof CheckCircle2 }
  > = {
    valid: {
      label: "Valid",
      className: "text-green-400 bg-green-500/10 border-green-500/30",
      icon: CheckCircle2,
    },
    pending: {
      label: "Pending",
      className: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
      icon: Clock,
    },
    invalid: {
      label: "Invalid",
      className: "text-red-400 bg-red-500/10 border-red-500/30",
      icon: XCircle,
    },
  };
  const c = config[status] ?? config.pending;
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${c.className}`}
    >
      <Icon size={10} />
      {c.label}
    </span>
  );
}
