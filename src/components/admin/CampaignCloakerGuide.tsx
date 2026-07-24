"use client";

import { ExternalLink } from "lucide-react";
import {
  buildFullCampaignUrl,
  COUNTRY_OPTIONS,
  DEVICE_OPTIONS,
  type DeviceType,
  type TrafficCampaign,
} from "@/lib/traffic-shield/campaign-types";

interface CampaignCloakerGuideProps {
  campaign: TrafficCampaign;
  campaignUrl: string;
  urlParams: string;
}

function formatDevices(devices: DeviceType[]): string {
  if (!devices.length) return "Todos";
  return devices
    .map((d) => DEVICE_OPTIONS.find((o) => o.id === d)?.label ?? d)
    .join(", ");
}

function formatCountries(codes: string[]): string {
  if (!codes.length) return "Todos";
  return codes
    .map((c) => COUNTRY_OPTIONS.find((o) => o.code === c)?.label ?? c)
    .join(", ");
}

export function CampaignCloakerGuide({
  campaign,
  campaignUrl,
  urlParams,
}: CampaignCloakerGuideProps) {
  const fullUrl = buildFullCampaignUrl(campaignUrl, urlParams);
  const joiner = fullUrl.includes("?") ? "&" : "?";
  const testOffer = `${fullUrl}${joiner}vp_test=offer`;
  const testSafe = `${fullUrl}${joiner}vp_test=safe`;

  return (
    <div className="space-y-4 rounded border border-accent/20 bg-accent/5 p-4">
      <div>
        <p className="text-[10px] tracking-widest text-accent uppercase">
          Como o cloaker decide
        </p>
        <p className="mt-2 text-xs leading-relaxed text-muted">
          O link <strong className="text-white">não escolhe</strong> a página
          pelos parâmetros sozinhos. O norat analisa cada visita e envia:
        </p>
        <ul className="mt-3 space-y-2 text-xs text-muted">
          <li>
            <strong className="text-green-400">Oferta</strong> → cliente real
            (celular certo, país certo, token válido, não é bot)
          </li>
          <li>
            <strong className="text-yellow-400">Segura</strong> → bots do Meta,
            revisores, desktop se o anúncio é só mobile, link sem{" "}
            <code className="text-accent">vp_t</code>, etc.
          </li>
        </ul>
      </div>

      <div className="grid gap-2 text-[10px] sm:grid-cols-2">
        <div className="rounded border border-white/10 bg-black/30 px-3 py-2">
          <span className="text-muted">Dispositivos permitidos:</span>{" "}
          <span className="text-white">
            {formatDevices(campaign.allowedDevices)}
          </span>
        </div>
        <div className="rounded border border-white/10 bg-black/30 px-3 py-2">
          <span className="text-muted">Países permitidos:</span>{" "}
          <span className="text-white">
            {formatCountries(campaign.allowedCountries)}
          </span>
        </div>
        <div className="rounded border border-white/10 bg-black/30 px-3 py-2">
          <span className="text-muted">Token único:</span>{" "}
          <span className="text-white">
            {campaign.uniqueTokenEnabled ? "Ativo (vp_t obrigatório)" : "Desativado"}
          </span>
        </div>
        <div className="rounded border border-white/10 bg-black/30 px-3 py-2">
          <span className="text-muted">Status:</span>{" "}
          <span className="text-white">
            {campaign.status === "active" ? "Ativa" : "Pausada → sempre segura"}
          </span>
        </div>
      </div>

      <div className="rounded border border-yellow-500/20 bg-yellow-500/5 p-3 text-[10px] text-muted">
        <strong className="text-yellow-400">Testando no PC?</strong> Se a
        campanha está segmentada para{" "}
        <strong className="text-white">Mobile</strong>, o computador{" "}
        <strong className="text-white">sempre</strong> verá a página segura —
        isso é intencional. Teste no celular ou use os links abaixo.
      </div>

      <div className="space-y-2">
        <p className="text-[10px] tracking-widest text-muted uppercase">
          Links de teste (só para você)
        </p>
        <TestLink label="Forçar oferta (preview)" href={testOffer} />
        <TestLink label="Forçar segura (preview)" href={testSafe} />
      </div>

      <p className="text-[10px] text-muted">
        Os parâmetros <code className="text-accent">URL PARAMS</code> validam que
        o clique veio do seu anúncio — não são a URL da oferta. A oferta é{" "}
        <code className="text-accent">{campaign.offerPageUrl}</code>.
      </p>
    </div>
  );
}

function TestLink({ label, href }: { label: string; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-between gap-3 rounded border border-white/10 bg-black/40 px-3 py-2.5 text-[10px] hover:border-accent"
    >
      <span className="text-white">{label}</span>
      <ExternalLink size={12} className="shrink-0 text-muted" />
    </a>
  );
}
