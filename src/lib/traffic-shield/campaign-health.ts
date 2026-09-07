export type CampaignHealthAlert = {
  level: "info" | "warn";
  message: string;
};

/** Alerta operacional: muitos safes vs poucos offers. */
export function getCampaignHealthAlert(
  clicksOffer: number,
  clicksSafe: number
): CampaignHealthAlert | null {
  const offer = Math.max(0, clicksOffer);
  const safe = Math.max(0, clicksSafe);
  const total = offer + safe;

  if (total < 20) return null;

  const safeRatio = safe / total;

  if (safeRatio >= 0.85 && offer <= Math.max(3, total * 0.08)) {
    return {
      level: "warn",
      message:
        "Muitos cliques na página segura e poucos na oferta. Confira se o link do anúncio está completo (com token), se país/dispositivo batem com o tráfego e se a campanha está ativa.",
    };
  }

  if (safeRatio >= 0.7) {
    return {
      level: "info",
      message:
        "Taxa alta de página segura. Pode ser revisão da plataforma ou filtro apertado — monitore nas próximas horas.",
    };
  }

  return null;
}

export function getWorkspaceHealthAlert(
  campaigns: { clicksOffer: number; clicksSafe: number; status: string }[]
): CampaignHealthAlert | null {
  const active = campaigns.filter((c) => c.status === "active");
  if (active.length === 0) return null;

  const offer = active.reduce((s, c) => s + (c.clicksOffer || 0), 0);
  const safe = active.reduce((s, c) => s + (c.clicksSafe || 0), 0);
  return getCampaignHealthAlert(offer, safe);
}
