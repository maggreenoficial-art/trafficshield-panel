"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronRight, CheckCircle2, ExternalLink, GitBranch, Globe, Loader2, Settings2, Shield, X } from "lucide-react";
import type {
  CreateCampaignInput,
  DeliveryMethod,
  DeviceType,
  OfferType,
  TrafficDomain,
  TrafficSource,
} from "@/lib/traffic-shield/campaign-types";
import {
  allowedCountriesFromSelection,
  allowedDevicesFromSelection,
  COUNTRY_OPTIONS,
  DELIVERY_METHOD_GUIDE,
  DEVICE_OPTIONS,
  getDefaultDeliveryMethodsForSource,
  isValidCustomSlug,
  normalizeCustomSlug,
  OFFER_TYPE_OPTIONS,
  SAFE_PAGE_SUGGESTIONS,
  TRAFFIC_SOURCES,
} from "@/lib/traffic-shield/campaign-types";
import { CampaignUrlDeliverables } from "@/components/admin/CampaignUrlDeliverables";
import { CampaignAdInsertionGuide } from "@/components/admin/CampaignAdInsertionGuide";
import type { SiteCampaignDomain } from "@/lib/traffic-shield/site-domain";

const emptyForm: CreateCampaignInput = {
  name: "",
  useSiteDomain: true,
  trafficSource: "meta",
  allowedCountries: [],
  allowedDevices: [],
  safePageUrl: "/bem-estar",
  offerPageUrl: "",
  safeDeliveryMethod: "redirect",
  offerDeliveryMethod: "redirect",
  uniqueTokenEnabled: true,
  customPathEnabled: false,
  status: "draft",
};

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6;

interface CreateCampaignModalProps {
  domains: TrafficDomain[];
  siteDomain: SiteCampaignDomain | null;
  onClose: () => void;
  onCreated: (
    campaignId: string,
    campaignUrl?: string,
    urlParams?: string,
    openCharts?: boolean
  ) => void;
}

export function CreateCampaignModal({
  domains,
  siteDomain: siteDomainProp,
  onClose,
  onCreated,
}: CreateCampaignModalProps) {
  const validDomains = useMemo(
    () => domains.filter((d) => d.status === "valid"),
    [domains]
  );

  const [clientSiteHostname, setClientSiteHostname] = useState<string | null>(
    null
  );

  useEffect(() => {
    if (typeof window !== "undefined") {
      setClientSiteHostname(window.location.hostname);
    }
  }, []);

  const siteDomain: SiteCampaignDomain | null =
    siteDomainProp ??
    (clientSiteHostname
      ? {
          hostname: clientSiteHostname,
          label: "Domínio da loja (hospedagem atual)",
        }
      : null);

  const [domainMode, setDomainMode] = useState<"site" | "custom">("site");

  const [step, setStep] = useState<WizardStep>(1);
  const [form, setForm] = useState<CreateCampaignInput>(emptyForm);
  const [deviceSelection, setDeviceSelection] = useState<"all" | DeviceType>("all");
  const [countrySelection, setCountrySelection] = useState<"all" | string>("all");
  const [offerType, setOfferType] = useState<OfferType>("single");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedResult, setSavedResult] = useState<{
    campaignId: string;
    campaignUrl: string;
    urlParams: string;
    campaignName: string;
    trafficSource: TrafficSource;
  } | null>(null);

  useEffect(() => {
    if (domainMode !== "custom") return;
    const primary =
      validDomains.find((d) => d.isPrimary) ?? validDomains[0];
    if (primary) {
      setForm((prev) => ({
        ...prev,
        useSiteDomain: false,
        domainId: primary.id,
      }));
    }
  }, [validDomains, domainMode]);

  const stepMeta: Record<WizardStep, { label: string; title: string }> = {
    1: { label: "4", title: "Nova campanha" },
    2: { label: "5", title: "Segmentação de público" },
    3: { label: "6", title: "Página segura" },
    4: { label: "7", title: "Página de oferta" },
    5: { label: "8", title: "Método de entrega" },
    6: { label: "10", title: "Custom Path" },
  };

  const selectedDomain =
    domainMode === "custom"
      ? validDomains.find((d) => d.id === form.domainId)
      : null;
  const previewHostname =
    domainMode === "site"
      ? siteDomain?.hostname
      : selectedDomain?.hostname;
  const previewSlug =
    form.customPathEnabled && form.customSlug?.trim()
      ? normalizeCustomSlug(form.customSlug)
      : "campanha-abc123";
  const previewCampaignUrl = previewHostname
    ? `https://${previewHostname}/c/${previewSlug || "sua-slug"}`
    : `https://seu-dominio.com/c/${previewSlug || "sua-slug"}`;
  const sourceDefaults = getDefaultDeliveryMethodsForSource(form.trafficSource);

  const hasDomainSelected =
    domainMode === "site"
      ? Boolean(siteDomain?.hostname)
      : Boolean(form.domainId);

  const canContinueStep1 =
    form.name.trim().length > 0 &&
    hasDomainSelected &&
    Boolean(form.trafficSource);

  const canContinueSafePage = form.safePageUrl.trim().length > 0;

  const canSave =
    form.offerPageUrl.trim().length > 0 && canContinueSafePage;

  const isExternalOffer = /^https?:\/\//i.test(form.offerPageUrl.trim());

  const syncSegmentation = () => {
    setForm((prev) => ({
      ...prev,
      allowedDevices: allowedDevicesFromSelection(deviceSelection),
      allowedCountries: allowedCountriesFromSelection(countrySelection),
    }));
  };

  const handleContinueFromBasic = () => {
    setError("");
    if (!canContinueStep1) {
      setError("Preencha nome, domínio e fonte de tráfego.");
      return;
    }
    setStep(2);
  };

  const handleContinueFromSegmentation = () => {
    setError("");
    syncSegmentation();
    setStep(3);
  };

  const handleContinueFromSafePage = () => {
    setError("");
    if (!canContinueSafePage) {
      setError("Informe a URL da página segura.");
      return;
    }
    setStep(4);
  };

  const handleContinueFromOffer = () => {
    setError("");
    if (!form.offerPageUrl.trim()) {
      setError("Informe a URL da página de oferta.");
      return;
    }
    setStep(5);
  };

  const handleContinueFromDelivery = () => {
    setError("");
    setStep(6);
  };

  const handleCreate = async () => {
    setError("");
    if (!canSave) {
      setError("Informe a URL da página de oferta.");
      return;
    }
    if (form.customPathEnabled) {
      const slug = normalizeCustomSlug(form.customSlug ?? "");
      if (!isValidCustomSlug(slug)) {
        setError(
          "Informe um slug válido (ex: vsl-01). Use apenas letras minúsculas, números e hífens."
        );
        return;
      }
    }
    setSaving(true);
    const payload: CreateCampaignInput = {
      ...form,
      useSiteDomain: domainMode === "site",
      domainId: domainMode === "site" ? undefined : form.domainId,
      allowedDevices: allowedDevicesFromSelection(deviceSelection),
      allowedCountries: allowedCountriesFromSelection(countrySelection),
      offerDeliveryMethod: isExternalOffer
        ? "redirect"
        : form.offerDeliveryMethod,
      customSlug: form.customPathEnabled
        ? normalizeCustomSlug(form.customSlug ?? "")
        : undefined,
    };
    const res = await fetch("/api/admin/traffic/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "Erro ao criar campanha.");
      setSaving(false);
      return;
    }
    setSavedResult({
      campaignId: json.campaign.id,
      campaignUrl: json.campaign.campaignUrl ?? "",
      urlParams: json.campaign.urlParams ?? "",
      campaignName: json.campaign.name ?? form.name,
      trafficSource: form.trafficSource,
    });
    setSaving(false);
  };

  const handleFinish = () => {
    if (!savedResult) return;
    onCreated(
      savedResult.campaignId,
      savedResult.campaignUrl,
      savedResult.urlParams,
      true
    );
  };

  if (savedResult) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto border border-green-500/30 bg-black">
          <div className="border-b border-white/10 px-6 py-5">
            <p className="text-[10px] tracking-widest text-accent uppercase">
              Passos 11 e 12
            </p>
            <div className="mt-2 flex items-center gap-2">
              <CheckCircle2 size={20} className="text-green-400" />
              <h3 className="text-lg font-medium">Campanha salva com sucesso</h3>
            </div>
            <p className="mt-2 text-xs text-muted">
              <strong className="text-white">{savedResult.campaignName}</strong>{" "}
              foi criada. Copie os dois entregáveis abaixo e use no seu anúncio.
            </p>
          </div>

          <div className="p-6">
            <CampaignUrlDeliverables
              campaignUrl={savedResult.campaignUrl}
              urlParams={savedResult.urlParams}
            />

            <div className="mt-6">
              <CampaignAdInsertionGuide
                campaignUrl={savedResult.campaignUrl}
                urlParams={savedResult.urlParams}
                trafficSource={savedResult.trafficSource}
              />
            </div>

            <p className="mt-4 text-[10px] text-muted">
              Após publicar o anúncio, abra a campanha e vá na aba{" "}
              <strong className="text-white">Charts</strong> para acompanhar as
              requisições em tempo real (Passo 13).
            </p>

            <button
              type="button"
              onClick={handleFinish}
              className="mt-6 w-full rounded-full bg-white py-2.5 text-xs font-semibold text-black hover:bg-accent"
            >
              Concluir e ver Charts
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className={`max-h-[90vh] w-full overflow-y-auto border border-white/10 bg-black ${step === 5 ? "max-w-3xl" : "max-w-2xl"}`}>
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-[10px] tracking-widest text-accent uppercase">
              Passo {stepMeta[step].label} de 11
            </p>
            <h3 className="mt-1 text-lg font-medium">{stepMeta[step].title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {step === 1 && (
          <div className="p-6">
            <section>
              <h4 className="text-xs font-semibold tracking-widest text-white uppercase">
                Informações básicas
              </h4>
              <p className="mt-1 text-xs text-muted">
                Defina um nome, escolha onde a campanha será hospedada e a fonte
                onde você vai anunciar.
              </p>

              <div className="mt-6 space-y-5">
                <Field
                  label="Nome da campanha"
                  hint="Um nome para você identificar a campanha"
                  value={form.name}
                  onChange={(v) => setForm({ ...form, name: v })}
                  placeholder="Ex: FACEBOOK — Lançamento verão"
                  autoFocus
                />

                <div>
                  <label className="mb-1 block text-[10px] tracking-widest text-muted uppercase">
                    Domínio
                  </label>
                  <p className="mb-2 text-[10px] text-muted">
                    Use o domínio fixo da loja (padrão) ou um domínio de campanha
                    isolada com CNAME validado
                  </p>

                  <div className="space-y-2">
                    {siteDomain ? (
                      <button
                        type="button"
                        onClick={() => {
                          setDomainMode("site");
                          setForm((prev) => ({
                            ...prev,
                            useSiteDomain: true,
                            domainId: undefined,
                          }));
                        }}
                        className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors ${
                          domainMode === "site"
                            ? "border-accent bg-accent/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <Globe
                          size={16}
                          className={
                            domainMode === "site" ? "text-accent" : "text-muted"
                          }
                        />
                        <div>
                          <p className="text-sm font-medium">
                            {siteDomain.hostname}
                          </p>
                          <p className="text-[10px] text-muted">
                            {siteDomain.label} — sem CNAME, já hospedado
                          </p>
                        </div>
                        <span className="ml-auto text-[10px] text-accent">
                          Padrão
                        </span>
                      </button>
                    ) : (
                      <div className="rounded border border-yellow-500/30 bg-yellow-500/5 p-4 text-xs text-yellow-300/90">
                        Domínio da loja não detectado. Defina{" "}
                        <strong>NEXT_PUBLIC_SITE_URL</strong> no ambiente ou
                        acesse o painel pelo domínio da loja.
                      </div>
                    )}

                    {validDomains.length > 0 && (
                      <>
                        <p className="pt-2 text-[10px] tracking-widest text-muted uppercase">
                          Domínios de campanha (CNAME)
                        </p>
                        {validDomains.map((domain) => (
                          <button
                            key={domain.id}
                            type="button"
                            onClick={() => {
                              setDomainMode("custom");
                              setForm({
                                ...form,
                                useSiteDomain: false,
                                domainId: domain.id,
                              });
                            }}
                            className={`flex w-full items-center gap-3 border px-4 py-3 text-left transition-colors ${
                              domainMode === "custom" &&
                              form.domainId === domain.id
                                ? "border-accent bg-accent/10"
                                : "border-white/10 hover:border-white/20"
                            }`}
                          >
                            <Globe
                              size={16}
                              className={
                                domainMode === "custom" &&
                                form.domainId === domain.id
                                  ? "text-accent"
                                  : "text-muted"
                              }
                            />
                            <div>
                              <p className="text-sm font-medium">
                                {domain.hostname}
                              </p>
                              {domain.label && (
                                <p className="text-[10px] text-muted">
                                  {domain.label}
                                </p>
                              )}
                            </div>
                            {domain.isPrimary && (
                              <span className="ml-auto text-[10px] text-muted">
                                Principal
                              </span>
                            )}
                          </button>
                        ))}
                      </>
                    )}

                    {validDomains.length === 0 && siteDomain && (
                      <p className="text-[10px] text-muted">
                        Para campanhas isoladas em outro domínio, cadastre e
                        valide na aba <strong>Domínios</strong>.
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-[10px] tracking-widest text-muted uppercase">
                    Fonte de tráfego
                  </label>
                  <p className="mb-3 text-[10px] text-muted">
                    Defina a origem do tráfego para melhor rastreamento
                  </p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {TRAFFIC_SOURCES.map((source) => (
                      <button
                        key={source.id}
                        type="button"
                        onClick={() => {
                          const defaults = getDefaultDeliveryMethodsForSource(
                            source.id as TrafficSource
                          );
                          setForm({
                            ...form,
                            trafficSource: source.id as TrafficSource,
                            safeDeliveryMethod: defaults.safe,
                            offerDeliveryMethod: defaults.offer,
                          });
                        }}
                        className={`flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
                          form.trafficSource === source.id
                            ? "border-accent bg-accent/10"
                            : "border-white/10 hover:border-white/20"
                        }`}
                      >
                        <span
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: source.color }}
                        >
                          {source.shortLabel.slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <p className="text-sm font-medium">
                            {source.shortLabel}
                          </p>
                          <p className="text-[10px] text-muted">{source.label}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <WizardActions
              primaryLabel="Continuar"
              onPrimary={handleContinueFromBasic}
              primaryDisabled={!canContinueStep1}
              onCancel={onClose}
            />
          </div>
        )}

        {step === 2 && (
          <div className="p-6">
            <section>
              <h4 className="text-xs font-semibold tracking-widest text-white uppercase">
                Segmentação de público
              </h4>
              <p className="mt-1 text-xs text-muted">
                Selecione exatamente a mesma segmentação do seu anúncio em{" "}
                <strong className="text-white">Dispositivo</strong> e{" "}
                <strong className="text-white">País</strong>. Se você anuncia
                para todos, deixe <strong className="text-white">Todos</strong>{" "}
                selecionado nos dois campos.
              </p>

              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Dispositivo"
                  hint="Selecione um dispositivo"
                  value={deviceSelection}
                  onChange={(v) =>
                    setDeviceSelection(v as "all" | DeviceType)
                  }
                >
                  <option value="all">Todos</option>
                  {DEVICE_OPTIONS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </SelectField>

                <SelectField
                  label="País"
                  hint="Selecione um país"
                  value={countrySelection}
                  onChange={setCountrySelection}
                >
                  <option value="all">Todos</option>
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </SelectField>
              </div>

              <div className="mt-5 rounded border border-white/10 bg-white/[0.02] p-4 text-[10px] text-muted">
                <strong className="text-white">Resumo da segmentação:</strong>
                <ul className="mt-2 space-y-1">
                  <li>
                    Dispositivo:{" "}
                    <span className="text-accent">
                      {deviceSelection === "all"
                        ? "Todos (sem restrição)"
                        : DEVICE_OPTIONS.find((d) => d.id === deviceSelection)
                            ?.label}
                    </span>
                  </li>
                  <li>
                    País:{" "}
                    <span className="text-accent">
                      {countrySelection === "all"
                        ? "Todos (sem restrição)"
                        : COUNTRY_OPTIONS.find((c) => c.code === countrySelection)
                            ?.label}
                    </span>
                  </li>
                </ul>
              </div>
            </section>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <WizardActions
              primaryLabel="Continuar"
              onPrimary={handleContinueFromSegmentation}
              onBack={() => setStep(1)}
              onCancel={onClose}
            />
          </div>
        )}

        {step === 3 && (
          <div className="p-6">
            <section>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-green-400" />
                <h4 className="text-xs font-semibold tracking-widest text-white uppercase">
                  Página segura
                </h4>
              </div>
              <p className="mt-2 text-xs text-muted">
                Cole em <strong className="text-white">URL da página segura</strong>{" "}
                o endereço exibido para acessos indesejados — bots, ferramentas de
                espionagem e concorrentes.
              </p>

              <div className="mt-4 rounded border border-green-500/20 bg-green-500/5 p-4 text-[10px] leading-relaxed text-muted">
                <strong className="text-green-400">Requisitos da página segura:</strong>
                <ul className="mt-2 list-disc space-y-1.5 pl-4">
                  <li>
                    Estar <strong className="text-white">100% dentro das políticas</strong>{" "}
                    das plataformas de anúncio, sem elementos que possam causar reprovação.
                  </li>
                  <li>
                    Ser <strong className="text-white">congruente com o tema do anúncio</strong>,
                    para não levantar suspeita durante a revisão.
                  </li>
                </ul>
              </div>

              <div className="mt-6">
                <Field
                  label="URL da página segura"
                  hint="Caminho interno (ex: /bem-estar) ou URL completa"
                  value={form.safePageUrl}
                  onChange={(v) => setForm({ ...form, safePageUrl: v })}
                  placeholder="https://seudominio.com/bem-estar"
                  autoFocus
                />
              </div>

              <div className="mt-4">
                <p className="mb-2 text-[10px] tracking-widest text-muted uppercase">
                  Sugestões compatíveis
                </p>
                <div className="space-y-2">
                  {SAFE_PAGE_SUGGESTIONS.map((s) => (
                    <button
                      key={s.path}
                      type="button"
                      onClick={() => setForm({ ...form, safePageUrl: s.path })}
                      className={`flex w-full items-start justify-between gap-3 border px-4 py-3 text-left transition-colors ${
                        form.safePageUrl === s.path
                          ? "border-accent bg-accent/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div>
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-[10px] text-muted">{s.desc}</p>
                      </div>
                      <code className="shrink-0 text-[10px] text-accent">
                        {s.path}
                      </code>
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <WizardActions
              primaryLabel="Continuar"
              onPrimary={handleContinueFromSafePage}
              primaryDisabled={!canContinueSafePage}
              onBack={() => setStep(2)}
              onCancel={onClose}
            />
          </div>
        )}

        {step === 4 && (
          <div className="p-6">
            <section>
              <div className="flex items-center gap-2">
                <ExternalLink size={16} className="text-accent" />
                <h4 className="text-xs font-semibold tracking-widest text-white uppercase">
                  Página de oferta
                </h4>
              </div>
              <p className="mt-2 text-xs text-muted">
                Cole em{" "}
                <strong className="text-white">URL da página de oferta</strong> o
                endereço real da sua oferta — a página exibida para o tráfego
                qualificado. Aqui você pode usar o{" "}
                <strong className="text-white">domínio real da oferta</strong>.
              </p>

              <div className="mt-4 rounded border border-accent/20 bg-accent/5 p-4 text-[10px] leading-relaxed text-muted">
                <strong className="text-accent">Isolamento recomendado:</strong>
                <ul className="mt-2 list-disc space-y-1.5 pl-4">
                  <li>
                    Nem a página segura nem a de oferta precisam de conexão com o
                    Traffic Shield —{" "}
                    <strong className="text-white">
                      só o domínio da campanha
                    </strong>{" "}
                    aponta para ele.
                  </li>
                  <li>
                    Mantenha o{" "}
                    <strong className="text-white">
                      domínio da oferta isolado
                    </strong>{" "}
                    (ex: <code className="text-accent">oferta.seudominio.com</code>
                    ). Isso aumenta a proteção sem mexer na sua estrutura.
                  </li>
                </ul>
              </div>

              <div className="mt-6">
                <label className="mb-1 block text-[10px] tracking-widest text-muted uppercase">
                  Tipo de oferta
                </label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {OFFER_TYPE_OPTIONS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      disabled={t.disabled}
                      onClick={() => setOfferType(t.id)}
                      className={`rounded-full border px-4 py-2 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        offerType === t.id
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-white/10 text-muted hover:border-white/20"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <Field
                  label="URL da página de oferta"
                  hint="URL completa do domínio real da oferta ou caminho interno (/loja)"
                  value={form.offerPageUrl}
                  onChange={(v) => setForm({ ...form, offerPageUrl: v })}
                  placeholder="https://oferta.seudominio.com/pagina"
                  autoFocus
                />
              </div>

              <div className="mt-4 space-y-2">
                <p className="text-[10px] tracking-widest text-muted uppercase">
                  Exemplos
                </p>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      offerPageUrl: "https://oferta.seudominio.com",
                    })
                  }
                  className="flex w-full items-center justify-between border border-white/10 px-4 py-3 text-left hover:border-white/20"
                >
                  <span className="text-sm">Domínio externo isolado</span>
                  <code className="text-[10px] text-accent">
                    https://oferta.seudominio.com
                  </code>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      offerPageUrl: "/loja",
                    })
                  }
                  className="flex w-full items-center justify-between border border-white/10 px-4 py-3 text-left hover:border-white/20"
                >
                  <span className="text-sm">Página interna (mirror)</span>
                  <code className="text-[10px] text-accent">/loja</code>
                </button>
              </div>
            </section>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <WizardActions
              primaryLabel="Continuar"
              onPrimary={handleContinueFromOffer}
              primaryDisabled={!form.offerPageUrl.trim()}
              onBack={() => setStep(3)}
              onCancel={onClose}
            />
          </div>
        )}

        {step === 5 && (
          <div className="p-6">
            <section>
              <div className="flex items-center gap-2">
                <Settings2 size={16} className="text-accent" />
                <h4 className="text-xs font-semibold tracking-widest text-white uppercase">
                  Método de entrega
                </h4>
              </div>
              <p className="mt-2 text-xs text-muted">
                Definido <strong className="text-white">separadamente</strong> para
                a página segura e para a de oferta. Escolha como o acesso chega a
                cada página.
              </p>

              <div className="mt-5 overflow-x-auto border border-white/10">
                <table className="w-full min-w-[560px] text-left text-[10px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.02] text-muted">
                      <th className="px-3 py-2.5 font-medium">Método</th>
                      <th className="px-3 py-2.5 font-medium">Como funciona</th>
                      <th className="px-3 py-2.5 font-medium">Quando usar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DELIVERY_METHOD_GUIDE.map((m) => (
                      <tr
                        key={m.id}
                        className="border-b border-white/5 text-muted"
                      >
                        <td className="px-3 py-2.5 font-medium text-white">
                          {m.label}
                          {m.badge && (
                            <span className="ml-1 text-[8px] text-accent">
                              ({m.badge})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">{m.howItWorks}</td>
                        <td className="px-3 py-2.5">{m.whenToUse}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-6">
                <DeliveryMethodPicker
                  title="Página segura"
                  subtitle={form.safePageUrl}
                  methods={DELIVERY_METHOD_GUIDE.filter((m) => m.forSafe)}
                  selected={form.safeDeliveryMethod ?? "redirect"}
                  onSelect={(id) =>
                    setForm({ ...form, safeDeliveryMethod: id })
                  }
                />
              </div>

              <div className="mt-6">
                <DeliveryMethodPicker
                  title="Página de oferta"
                  subtitle={form.offerPageUrl}
                  methods={DELIVERY_METHOD_GUIDE.filter((m) => m.forOffer)}
                  selected={
                    isExternalOffer
                      ? "redirect"
                      : (form.offerDeliveryMethod ?? "redirect")
                  }
                  onSelect={(id) =>
                    setForm({ ...form, offerDeliveryMethod: id })
                  }
                  disabledIds={
                    isExternalOffer ? ["mirror", "unpack"] : []
                  }
                />
                {isExternalOffer && (
                  <p className="mt-2 text-[10px] text-yellow-400">
                    URL externa detectada — Mirror e Unpack não estão disponíveis
                    para oferta. Usando Redirect.
                  </p>
                )}
              </div>

              <div className="mt-4 rounded border border-white/10 bg-white/[0.02] p-3 text-[10px] text-muted">
                <strong className="text-white">Padrão para{" "}
                {TRAFFIC_SOURCES.find((s) => s.id === form.trafficSource)
                  ?.shortLabel ?? form.trafficSource}:</strong>{" "}
                Segura ={" "}
                <span className="text-accent">
                  {
                    DELIVERY_METHOD_GUIDE.find(
                      (m) => m.id === sourceDefaults.safe
                    )?.label
                  }
                </span>
                , Oferta ={" "}
                <span className="text-accent">
                  {
                    DELIVERY_METHOD_GUIDE.find(
                      (m) => m.id === sourceDefaults.offer
                    )?.label
                  }
                </span>
                . Se não souber qual escolher, use os padrões acima.{" "}
                <button
                  type="button"
                  onClick={() =>
                    setForm({
                      ...form,
                      safeDeliveryMethod: sourceDefaults.safe,
                      offerDeliveryMethod: sourceDefaults.offer,
                    })
                  }
                  className="text-accent underline hover:no-underline"
                >
                  Aplicar padrões
                </button>
              </div>

              <div className="mt-6 border-t border-white/10 pt-5">
                <ToggleRow
                  label="Enable Unique Token"
                  hint="Cada campanha recebe automaticamente um parâmetro de rastreamento único na URL."
                  checked={form.uniqueTokenEnabled ?? true}
                  onChange={(v) => setForm({ ...form, uniqueTokenEnabled: v })}
                />
              </div>
            </section>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <WizardActions
              primaryLabel="Continuar"
              onPrimary={handleContinueFromDelivery}
              onBack={() => setStep(4)}
              onCancel={onClose}
            />
          </div>
        )}

        {step === 6 && (
          <div className="p-6">
            <section>
              <div className="flex items-center gap-2">
                <GitBranch size={16} className="text-accent" />
                <h4 className="text-xs font-semibold tracking-widest text-white uppercase">
                  Custom Path
                </h4>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[8px] text-muted">
                  Opcional
                </span>
              </div>
              <p className="mt-2 text-xs text-muted">
                Ative o toggle <strong className="text-white">Custom Path</strong>{" "}
                para escolher a slug que aparece na URL da campanha (ex.:{" "}
                <code className="text-accent">/vsl-01</code>). Se deixar desativado,
                o sistema gera uma slug aleatória automaticamente.
              </p>

              <div className="mt-4 rounded border border-white/10 bg-white/[0.02] p-4 text-[10px] text-muted">
                É apenas <strong className="text-white">cosmético</strong> — não
                afeta a lógica de filtragem, segmentação ou entrega da campanha.
              </div>

              <div className="mt-6">
                <ToggleRow
                  label="Custom Path"
                  hint={`Exemplo: ${previewCampaignUrl.replace(previewSlug, "custom-path")}`}
                  checked={form.customPathEnabled ?? false}
                  onChange={(enabled) =>
                    setForm({
                      ...form,
                      customPathEnabled: enabled,
                      customSlug: enabled
                        ? form.customSlug ||
                          normalizeCustomSlug(form.name) ||
                          "vsl-01"
                        : form.customSlug,
                    })
                  }
                />
              </div>

              {form.customPathEnabled ? (
                <div className="mt-5 space-y-4">
                  <Field
                    label="Slug da campanha"
                    hint="Aparece na URL após /c/ — use letras minúsculas, números e hífens"
                    value={form.customSlug ?? ""}
                    onChange={(v) =>
                      setForm({
                        ...form,
                        customSlug: normalizeCustomSlug(v),
                      })
                    }
                    placeholder="vsl-01"
                    autoFocus
                  />
                  <div className="rounded border border-accent/20 bg-accent/5 p-4">
                    <p className="text-[10px] tracking-widest text-muted uppercase">
                      Preview da URL
                    </p>
                    <p className="mt-2 break-all font-mono text-xs text-accent">
                      {previewCampaignUrl}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded border border-white/10 bg-white/[0.02] p-4 text-[10px] text-muted">
                  <strong className="text-white">Slug automática:</strong> ao salvar,
                  será gerada algo como{" "}
                  <code className="text-accent">facebook-lancamento-x7k2m9</code>{" "}
                  com base no nome da campanha.
                </div>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                {["vsl-01", "oferta", "promo-verao", "lp-01"].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        customPathEnabled: true,
                        customSlug: suggestion,
                      })
                    }
                    className="rounded-full border border-white/10 px-3 py-1 text-[10px] text-muted hover:border-accent hover:text-accent"
                  >
                    /{suggestion}
                  </button>
                ))}
              </div>
            </section>

            {error && <p className="mt-4 text-xs text-red-400">{error}</p>}

            <WizardActions
              primaryLabel={saving ? "Salvando..." : "Salvar campanha"}
              onPrimary={handleCreate}
              primaryDisabled={saving || !canSave}
              primaryLoading={saving}
              onBack={() => setStep(5)}
              onCancel={onClose}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function DeliveryMethodPicker({
  title,
  subtitle,
  methods,
  selected,
  onSelect,
  disabledIds = [],
}: {
  title: string;
  subtitle: string;
  methods: typeof DELIVERY_METHOD_GUIDE;
  selected: DeliveryMethod;
  onSelect: (id: DeliveryMethod) => void;
  disabledIds?: DeliveryMethod[];
}) {
  return (
    <div>
      <p className="text-[10px] tracking-widest text-muted uppercase">{title}</p>
      <p className="mt-0.5 truncate text-[10px] text-accent">{subtitle}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {methods.map((m) => {
          const disabled = disabledIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelect(m.id)}
              className={`rounded-full border px-4 py-2 text-[10px] transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                selected === m.id
                  ? "border-accent bg-accent/10 text-accent"
                  : "border-white/10 text-muted hover:border-white/20"
              }`}
            >
              {m.label}
              {m.badge && (
                <span className="ml-1 opacity-60">({m.badge})</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WizardActions({
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  onBack,
  onCancel,
}: {
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onBack?: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="mt-8 flex gap-3">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="px-4 text-xs text-muted hover:text-white"
        >
          Voltar
        </button>
      )}
      <button
        type="button"
        onClick={onPrimary}
        disabled={primaryDisabled || primaryLoading}
        className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white py-2.5 text-xs font-semibold text-black hover:bg-accent disabled:opacity-40"
      >
        {primaryLoading && <Loader2 size={14} className="animate-spin" />}
        {primaryLabel}
        {!primaryLoading && primaryLabel === "Continuar" && (
          <ChevronRight size={14} />
        )}
      </button>
      <button
        type="button"
        onClick={onCancel}
        className="px-4 text-xs text-muted hover:text-white"
      >
        Cancelar
      </button>
    </div>
  );
}

function SelectField({
  label,
  hint,
  value,
  onChange,
  children,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] tracking-widest text-muted uppercase">
        {label}
      </label>
      {hint && <p className="mb-2 text-[10px] text-muted">{hint}</p>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-white/10 bg-black px-3 py-2.5 text-sm outline-none focus:border-accent"
      >
        {children}
      </select>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-[10px] text-muted">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-accent" : "bg-white/20"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

function Field({
  label,
  hint,
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[10px] tracking-widest text-muted uppercase">
        {label}
      </label>
      {hint && <p className="mb-2 text-[10px] text-muted">{hint}</p>}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full border-b border-white/20 bg-transparent py-2.5 text-sm outline-none focus:border-accent"
      />
    </div>
  );
}
