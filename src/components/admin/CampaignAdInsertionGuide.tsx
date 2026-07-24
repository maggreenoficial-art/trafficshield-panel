"use client";

import type { TrafficSource } from "@/lib/traffic-shield/campaign-types";
import {
  buildFullCampaignUrl,
  getTrafficSourceConfig,
} from "@/lib/traffic-shield/campaign-types";

interface CampaignAdInsertionGuideProps {
  campaignUrl: string;
  urlParams: string;
  trafficSource: TrafficSource;
}

export function CampaignAdInsertionGuide({
  campaignUrl,
  urlParams,
  trafficSource,
}: CampaignAdInsertionGuideProps) {
  const source = getTrafficSourceConfig(trafficSource);
  const fullUrl = buildFullCampaignUrl(campaignUrl, urlParams);
  const trackingExample = urlParams
    ? `${fullUrl}&seu_param=valor`
    : `${campaignUrl}?seu_param=valor`;

  return (
    <div className="space-y-4 rounded border border-white/10 bg-white/[0.02] p-4">
      <div>
        <p className="text-[10px] tracking-widest text-accent uppercase">
          Passo 12 — Inserir nos anúncios
        </p>
        <p className="mt-1 text-xs text-muted">
          Como configurar no <strong className="text-white">{source.shortLabel}</strong>
        </p>
      </div>

      {source.separateParamsField ? (
        <div className="space-y-3 text-[10px] text-muted">
          <p>
            O <strong className="text-white">{source.shortLabel}</strong> tem campo
            separado para parâmetros
            {source.paramsFieldLabel
              ? ` ("${source.paramsFieldLabel}")`
              : ""}
            :
          </p>
          <ol className="list-decimal space-y-2 pl-4">
            <li>
              Cole a <strong className="text-white">URL</strong> no campo de destino
              do anúncio
            </li>
            <li>
              Cole os <strong className="text-white">URL PARAMS</strong> no campo de
              parâmetros / modelo de acompanhamento
            </li>
          </ol>
        </div>
      ) : (
        <div className="space-y-3 text-[10px] text-muted">
          <p>
            O <strong className="text-white">{source.shortLabel}</strong> não tem
            campo separado — junte URL e parâmetros com{" "}
            <code className="text-accent">?</code>:
          </p>
          <p className="break-all rounded border border-white/5 bg-black/40 px-3 py-2 font-mono text-[10px] text-accent">
            {fullUrl}
          </p>
        </div>
      )}

      <div className="border-t border-white/10 pt-3 text-[10px] text-muted">
        <p>
          <strong className="text-white">Com ferramenta de tracking:</strong> concatene
          seus parâmetros com <code className="text-accent">&</code> (a ordem não
          importa):
        </p>
        <p className="mt-2 break-all rounded border border-white/5 bg-black/40 px-3 py-2 font-mono text-[10px] text-accent">
          {trackingExample}
        </p>
      </div>
    </div>
  );
}
