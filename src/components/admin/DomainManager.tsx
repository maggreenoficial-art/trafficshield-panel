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
import { validateCampaignHostnameInput } from "@/lib/traffic-shield/campaign-hostname";
import {
  DnsSetupModal,
  type DnsRecordInstruction,
} from "@/components/admin/DnsSetupModal";
import {
  panelCardPadded,
  panelInput,
  panelMenu,
  panelMenuItem,
  panelPillBtn,
  panelSearch,
  panelSectionTitle,
  panelTableWrap,
} from "@/lib/panel-styles";
import { getPublicCnameTarget } from "@/lib/site-config";

export function DomainManager() {
  const [domains, setDomains] = useState<TrafficDomain[]>([]);
  const [slots, setSlots] = useState({ used: 0, limit: 10 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [dnsModal, setDnsModal] = useState<{
    instructions: DnsRecordInstruction;
    domainId?: string;
    originUrl?: string | null;
  } | null>(null);
  const [cnameTarget, setCnameTarget] = useState(getPublicCnameTarget);
  const [hostname, setHostname] = useState("");
  const [originUrl, setOriginUrl] = useState("");
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
    setCnameTarget(json.dns?.cnameTarget ?? getPublicCnameTarget());
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

    const hostCheck = validateCampaignHostnameInput(hostname);
    if (!hostCheck.ok) {
      setError(
        hostCheck.suggested
          ? `${hostCheck.message} Sugestão: ${hostCheck.suggested}`
          : hostCheck.message ?? "Domínio inválido."
      );
      setSaving(false);
      return;
    }

    const res = await fetch("/api/admin/traffic/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hostname,
        label: label || undefined,
        originUrl: originUrl.trim() || undefined,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Erro ao cadastrar.");
      setSaving(false);
      return;
    }
    setShowModal(false);
    setHostname("");
    setOriginUrl("");
    setLabel("");
    setSaving(false);
    if (json.dnsInstructions) {
      setDnsModal({
        instructions: json.dnsInstructions,
        domainId: json.domain?.id,
        originUrl: json.domain?.originUrl,
      });
    }
    await load();
  };

  const openDnsModal = async (domainId: string) => {
    setMenuOpen(null);
    const res = await fetch(`/api/admin/traffic/domains/${domainId}`);
    const json = await res.json();
    if (json.dnsInstructions) {
      setDnsModal({
        instructions: json.dnsInstructions,
        domainId,
        originUrl: json.domain?.originUrl,
      });
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
      <div className="flex flex-wrap items-center justify-end gap-4">
        <div className="landing-nav-pill rounded-full p-1">
          <button
            onClick={() => setShowModal(true)}
            disabled={slots.used >= slots.limit}
            className={`${panelPillBtn} flex items-center gap-1.5`}
          >
            <Plus size={14} />
            Adicionar domínio
          </button>
        </div>
      </div>

      <div className={panelCardPadded}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={panelSectionTitle}>Domain slots</p>
            <p className="mt-1 text-sm text-white/70">
              <span className="text-white/85">{slots.used}</span>
              <span className="text-white/40"> de {slots.limit} slots usados</span>
            </p>
          </div>
          <div className="h-1.5 w-48 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-white/30 transition-all"
              style={{ width: `${Math.min(100, slotPercent)}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-white/45">
        <strong className="text-white/65">Subdomínio dedicado:</strong>{" "}
        crie <code className="text-white/55">ads.seudominio.com</code> apontando para{" "}
        <code className="text-white/55">{cnameTarget || "edge norat"}</code>. O{" "}
        <code className="text-white/55">www</code> e o site principal{" "}
        <strong className="text-white/65">não são alterados</strong>.
      </div>

      <div className={panelSearch}>
        <Search size={16} className="text-white/35" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar domínio..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-white/25"
        />
        <button onClick={load} className="text-white/35 hover:text-white/70">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className={panelTableWrap}>
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02] text-white/40">
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
                      <p className="mt-0.5 text-sm text-muted">{domain.label}</p>
                    )}
                    {domain.originUrl && (
                      <p className="mt-1 max-w-[220px] truncate font-mono text-sm text-accent/80">
                        → {domain.originUrl}
                      </p>
                    )}
                    {domain.isPrimary && (
                      <span className="mt-1 inline-block text-sm text-accent">
                        ★ Principal
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={domain.status} />
                    {domain.validationMessage && (
                      <p className="mt-1 max-w-[180px] text-sm text-muted line-clamp-2">
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
                      <div className={panelMenu}>
                        <button
                          onClick={() => openDnsModal(domain.id)}
                          className={panelMenuItem}
                        >
                          <Globe size={12} /> Configurar DNS
                        </button>
                        <button
                          onClick={() => handleValidate(domain.id)}
                          className={panelMenuItem}
                        >
                          <RefreshCw size={12} /> Validar
                        </button>
                        {!domain.isPrimary && (
                          <button
                            onClick={() => handleSetPrimary(domain.id)}
                            className={panelMenuItem}
                          >
                            ★ Tornar principal
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(domain.id)}
                          className={`${panelMenuItem} text-red-400/90 hover:bg-red-500/[0.06]`}
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
          <div className={`w-full max-w-md ${panelCardPadded}`}>
            <h3 className="text-lg font-medium text-white/85">Adicionar domínio</h3>
            <p className="mt-2 text-sm text-white/40">
              Use um <strong className="text-white">subdomínio novo</strong> (ex:{" "}
              <code className="text-accent">ads.radario.sbs</code>). Não use o{" "}
              <code className="text-accent">www</code> do site — ele continua na
              hospedagem atual.
            </p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/40">
                  Subdomínio de campanha
                </label>
                <input
                  value={hostname}
                  onChange={(e) => setHostname(e.target.value)}
                  placeholder="ads.radario.sbs"
                  className={panelInput}
                  autoFocus
                />
                <p className="mt-2 text-sm text-white/35">
                  DNS: registro CNAME <code className="text-white/55">ads</code> →{" "}
                  <code className="text-white/55">{cnameTarget || "edge norat"}</code>
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/40">
                  URL de origem (opcional)
                </label>
                <input
                  value={originUrl}
                  onChange={(e) => setOriginUrl(e.target.value)}
                  placeholder="https://769a4c1b.vercel-dns.com"
                  className={panelInput}
                />
                <p className="mt-2 text-sm leading-relaxed text-white/35">
                  Só necessário se quiser proxy do subdomínio para o site. No modelo
                  padrão (subdomínio dedicado) pode deixar em branco.
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm text-white/40">
                  Apelido (opcional)
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Loja principal"
                  className={panelInput}
                />
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 text-sm text-white/40">
              <strong className="text-white/65">Como funciona:</strong>
              <ol className="mt-2 list-decimal space-y-1 pl-4">
                <li>Cadastre ads.seudominio.com (subdomínio)</li>
                <li>CNAME ads → edge norat (abaixo)</li>
                <li>Adicione o domínio na Vercel do projeto norat</li>
                <li>Valide no menu ⋯</li>
              </ol>
              {cnameTarget && (
                <p className="mt-2 text-sm text-white/55">
                  Destino CNAME: <code className="text-white/70">{cnameTarget}</code>
                </p>
              )}
            </div>

            {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

            <div className="mt-6 flex gap-3">
              <div className="landing-nav-pill flex-1 rounded-full p-1">
                <button
                  onClick={handleAdd}
                  disabled={saving || !hostname.trim()}
                  className={`${panelPillBtn} w-full`}
                >
                  {saving ? "Salvando..." : "Cadastrar domínio"}
                </button>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError("");
                  setOriginUrl("");
                }}
                className={`${panelPillBtn} px-4`}
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
          originUrl={dnsModal.originUrl}
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
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${c.className}`}
    >
      <Icon size={10} />
      {c.label}
    </span>
  );
}
