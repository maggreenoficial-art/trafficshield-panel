"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Play,
  Pause,
} from "lucide-react";
import type {
  CampaignStats,
  TrafficCampaign,
  TrafficDomain,
} from "@/lib/traffic-shield/campaign-types";
import {
  DELIVERY_METHODS,
  TRAFFIC_SOURCES,
} from "@/lib/traffic-shield/campaign-types";
import type { SiteCampaignDomain } from "@/lib/traffic-shield/site-domain";
import { CreateCampaignModal } from "@/components/admin/CreateCampaignModal";
import { CampaignUrlDeliverables } from "@/components/admin/CampaignUrlDeliverables";
import { CampaignAdInsertionGuide } from "@/components/admin/CampaignAdInsertionGuide";
import { CampaignChartsPanel } from "@/components/admin/CampaignChartsPanel";

export function CampaignManager() {
  const [campaigns, setCampaigns] = useState<TrafficCampaign[]>([]);
  const [domains, setDomains] = useState<TrafficDomain[]>([]);
  const [siteDomain, setSiteDomain] = useState<SiteCampaignDomain | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [campaignUrl, setCampaignUrl] = useState("");
  const [urlParams, setUrlParams] = useState("");
  const [detailTab, setDetailTab] = useState<"campaign" | "charts">("campaign");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [campRes, domRes] = await Promise.all([
      fetch("/api/admin/traffic/campaigns"),
      fetch("/api/admin/traffic/domains"),
    ]);
    const campJson = await campRes.json();
    const domJson = await domRes.json();
    setCampaigns(campJson.campaigns ?? []);
    setDomains(domJson.domains ?? []);
    setSiteDomain(domJson.siteDomain ?? null);
    setLoading(false);
  }, []);

  const loadStats = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/traffic/campaigns/${id}?stats=1`);
    const json = await res.json();
    setStats(json);
  }, []);

  const loadCampaignDetail = useCallback(
    async (id: string) => {
      const res = await fetch(`/api/admin/traffic/campaigns/${id}`);
      const json = await res.json();
      setCampaignUrl(json.campaignUrl ?? "");
      setUrlParams(json.urlParams ?? "");
      await loadStats(id);
    },
    [loadStats]
  );

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    loadCampaignDetail(selectedId);
    const interval = setInterval(() => loadStats(selectedId), 10000);
    return () => clearInterval(interval);
  }, [selectedId, loadCampaignDetail, loadStats]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return campaigns;
    return campaigns.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.includes(q) ||
        TRAFFIC_SOURCES.find((s) => s.id === c.trafficSource)
          ?.label.toLowerCase()
          .includes(q)
    );
  }, [campaigns, search]);

  const validDomainCount = domains.filter((d) => d.status === "valid").length;
  const canCreateCampaigns = Boolean(siteDomain) || validDomainCount > 0;

  const handleCreated = async (
    id: string,
    url?: string,
    params?: string,
    openCharts?: boolean
  ) => {
    setShowForm(false);
    setSelectedId(id);
    setDetailTab(openCharts ? "charts" : "campaign");
    if (url) setCampaignUrl(url);
    if (params) setUrlParams(params);
    await load();
  };

  const toggleStatus = async (campaign: TrafficCampaign) => {
    setMenuOpen(null);
    const next = campaign.status === "active" ? "paused" : "active";
    await fetch(`/api/admin/traffic/campaigns/${campaign.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    await load();
  };

  const handleDelete = async (id: string) => {
    setMenuOpen(null);
    if (!confirm("Excluir esta campanha?")) return;
    await fetch(`/api/admin/traffic/campaigns/${id}`, { method: "DELETE" });
    if (selectedId === id) setSelectedId(null);
    await load();
  };

  const selected = campaigns.find((c) => c.id === selectedId);

  if (loading && campaigns.length === 0) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-accent" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-serif text-xl italic sm:text-2xl">Campanhas</h2>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            URLs seguras, ofertas e segmentação de tráfego
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={!canCreateCampaigns}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-white px-5 py-2.5 text-xs font-semibold text-black hover:bg-accent disabled:opacity-40 sm:w-auto"
        >
          <Plus size={14} />
          Nova campanha
        </button>
      </div>

      {siteDomain && (
        <div className="rounded border border-white/10 bg-white/[0.02] p-4 text-xs text-muted">
          Campanhas usam por padrão o domínio da loja{" "}
          <strong className="text-white">{siteDomain.hostname}</strong>. Domínios
          extras na aba <strong>Domínios</strong> servem para campanhas isoladas
          com CNAME próprio.
        </div>
      )}

      {!canCreateCampaigns && (
        <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-4 text-xs text-yellow-300/90">
          Configure <strong>NEXT_PUBLIC_SITE_URL</strong> no ambiente ou valide um
          domínio na aba <strong>Domínios</strong> para criar campanhas.
        </div>
      )}

      <div className="flex items-center gap-3 border border-white/10 px-4 py-3">
        <Search size={16} className="text-muted" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filtrar campanhas..."
          className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted"
        />
        <button onClick={load} className="text-muted hover:text-white">
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      <p className="text-[10px] text-muted sm:hidden">
        Deslize horizontalmente para ver todas as colunas →
      </p>
      <div className="overflow-x-auto border border-white/10">
        <table className="w-full min-w-[900px] text-left text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-muted">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Fonte</th>
              <th className="px-4 py-3 font-medium">Hash</th>
              <th className="px-4 py-3 font-medium text-center text-accent">
                Offer
              </th>
              <th className="px-4 py-3 font-medium text-center text-green-400">
                Safe
              </th>
              <th className="px-4 py-3 font-medium text-center text-orange-400">
                Bots
              </th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="w-10 px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <Loader2 className="mx-auto animate-spin text-accent" size={24} />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-muted">
                  Nenhuma campanha criada.
                  <br />
                  Clique em &quot;Nova campanha&quot; para começar.
                </td>
              </tr>
            ) : (
              filtered.map((c) => {
                const source = TRAFFIC_SOURCES.find((s) => s.id === c.trafficSource);
                return (
                  <tr
                    key={c.id}
                    onClick={() => {
                      setSelectedId(c.id);
                      setDetailTab("campaign");
                    }}
                    className={`cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.02] ${
                      selectedId === c.id ? "bg-accent/5" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <p className="font-medium">{c.name}</p>
                      {c.domainHostname && (
                        <p className="mt-0.5 text-[10px] text-muted">
                          {c.domainHostname}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[8px] font-bold text-white"
                          style={{ backgroundColor: source?.color ?? "#666" }}
                        >
                          {source?.shortLabel.slice(0, 2).toUpperCase() ?? "?"}
                        </span>
                        <span>{source?.shortLabel ?? c.trafficSource}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-[10px] text-muted">
                      {c.slug}
                    </td>
                    <td className="px-4 py-4 text-center text-accent">
                      {formatCount(c.clicksOffer)}
                    </td>
                    <td className="px-4 py-4 text-center text-green-400">
                      {formatCount(c.clicksSafe)}
                    </td>
                    <td className="px-4 py-4 text-center text-orange-400">
                      {formatCount(c.clicksBots ?? 0)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-4 py-4 text-muted">
                      {new Date(c.createdAt).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td
                      className="relative px-4 py-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() =>
                          setMenuOpen(menuOpen === c.id ? null : c.id)
                        }
                        className="text-muted hover:text-white"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                      {menuOpen === c.id && (
                        <div className="absolute right-4 top-12 z-20 min-w-[140px] border border-white/10 bg-black py-1 shadow-xl">
                          <button
                            onClick={() => toggleStatus(c)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left hover:bg-white/5"
                          >
                            {c.status === "active" ? (
                              <Pause size={12} />
                            ) : (
                              <Play size={12} />
                            )}
                            {c.status === "active" ? "Pausar" : "Ativar"}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            className="flex w-full items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-red-500/10"
                          >
                            <Trash2 size={12} /> Excluir
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="border border-white/10 p-6 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-medium">{selected.name}</h3>
                <StatusBadge status={selected.status} />
              </div>
              <p className="mt-1 text-xs text-muted">
                /c/{selected.slug} ·{" "}
                {new Date(selected.createdAt).toLocaleString("pt-BR")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => toggleStatus(selected)}
                className="flex items-center gap-1 rounded-full border border-white/20 px-3 py-1.5 text-[10px] uppercase hover:border-accent"
              >
                {selected.status === "active" ? (
                  <Pause size={12} />
                ) : (
                  <Play size={12} />
                )}
                {selected.status === "active" ? "Pausar" : "Ativar"}
              </button>
              <button
                onClick={() => handleDelete(selected.id)}
                className="rounded-full border border-red-500/30 px-3 py-1.5 text-[10px] text-red-400 hover:bg-red-500/10"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>

          <div className="flex gap-1 border-b border-white/10">
            {(
              [
                { id: "campaign" as const, label: "Campaign" },
                { id: "charts" as const, label: "Charts" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setDetailTab(tab.id)}
                className={`px-4 py-2 text-xs transition-colors ${
                  detailTab === tab.id
                    ? "border-b-2 border-accent text-white"
                    : "text-muted hover:text-white"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {detailTab === "campaign" ? (
            <>
              <div className="rounded border border-white/10 bg-white/5 p-4">
                <p className="mb-4 text-[10px] tracking-widest text-muted uppercase">
                  Display Source — entregáveis do anúncio
                </p>
                <CampaignUrlDeliverables
                  campaignUrl={campaignUrl}
                  urlParams={urlParams}
                  compact
                />
              </div>

              <CampaignAdInsertionGuide
                campaignUrl={campaignUrl}
                urlParams={urlParams}
                trafficSource={selected.trafficSource}
              />

              <div className="grid gap-3 text-xs sm:grid-cols-2">
                <Info label="Página segura" value={selected.safePageUrl} />
                <Info label="Página de oferta" value={selected.offerPageUrl} />
                <Info
                  label="Fonte de tráfego"
                  value={
                    TRAFFIC_SOURCES.find((s) => s.id === selected.trafficSource)
                      ?.label ?? selected.trafficSource
                  }
                />
                <Info
                  label="Domínio"
                  value={selected.domainHostname ?? "—"}
                />
                <Info
                  label="Método (segura)"
                  value={
                    DELIVERY_METHODS.find((m) => m.id === selected.deliveryMethod)
                      ?.label ?? selected.deliveryMethod
                  }
                />
                <Info
                  label="Método (oferta)"
                  value={
                    DELIVERY_METHODS.find(
                      (m) => m.id === selected.offerDeliveryMethod
                    )?.label ?? selected.offerDeliveryMethod
                  }
                />
              </div>
            </>
          ) : (
            <CampaignChartsPanel
              stats={stats}
              fallbackOffer={selected.clicksOffer}
              fallbackSafe={selected.clicksSafe}
              fallbackBots={selected.clicksBots ?? 0}
            />
          )}
        </div>
      )}

      {showForm && (
        <CreateCampaignModal
          domains={domains}
          siteDomain={siteDomain}
          onClose={() => setShowForm(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "text-green-400 bg-green-500/10 border-green-500/30",
    },
    paused: {
      label: "Paused",
      className: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
    },
    draft: {
      label: "Draft",
      className: "text-muted bg-white/5 border-white/10",
    },
  };
  const c = config[status] ?? config.draft;
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${c.className}`}
    >
      {c.label}
    </span>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-white/5 p-3">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="mt-1 truncate">{value}</p>
    </div>
  );
}
