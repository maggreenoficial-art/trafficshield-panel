import { normalizeHostname } from "@/lib/traffic-shield/hostname-utils";

const VERCEL_API = "https://api.vercel.com";

function getVercelConfig() {
  const token =
    process.env.VERCEL_ACCESS_TOKEN?.trim() ||
    process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  const teamId = process.env.VERCEL_TEAM_ID?.trim();

  if (!token || !projectId) return null;
  return { token, projectId, teamId };
}

/** Registra o hostname no projeto Vercel para emitir SSL e rotear tráfego. */
export async function provisionVercelDomain(
  hostname: string
): Promise<{ ok: boolean; message: string }> {
  const config = getVercelConfig();
  const name = normalizeHostname(hostname);

  if (!config) {
    return {
      ok: false,
      message:
        "Provisionamento Vercel indisponível (defina VERCEL_ACCESS_TOKEN e VERCEL_PROJECT_ID).",
    };
  }

  const teamQuery = config.teamId
    ? `?teamId=${encodeURIComponent(config.teamId)}`
    : "";

  try {
    const response = await fetch(
      `${VERCEL_API}/v10/projects/${config.projectId}/domains${teamQuery}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name }),
      }
    );

    if (response.ok) {
      return { ok: true, message: `Domínio ${name} registrado na Vercel.` };
    }

    const body = (await response.json().catch(() => ({}))) as {
      error?: { code?: string; message?: string };
    };

    const code = body.error?.code ?? "";
    if (code === "domain_already_in_use" || code === "domain_already_exists") {
      return { ok: true, message: `Domínio ${name} já está na Vercel.` };
    }

    return {
      ok: false,
      message: body.error?.message ?? `Erro Vercel (${response.status}).`,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro de rede.";
    return { ok: false, message: msg };
  }
}
