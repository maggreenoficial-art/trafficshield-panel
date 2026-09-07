/**
 * Cliente Kie AI (Market jobs).
 * Docs: https://docs.kie.ai/
 * Key: só no servidor via KIE_AI_API_KEY.
 */

const KIE_BASE = "https://api.kie.ai";

export type KieCreateTaskBody = {
  model: string;
  callBackUrl?: string;
  input: Record<string, unknown>;
};

export type KieCreateTaskResult = {
  taskId: string;
};

export type KieTaskState =
  | "waiting"
  | "queuing"
  | "generating"
  | "success"
  | "fail";

export type KieTaskInfo = {
  taskId: string;
  model: string;
  state: KieTaskState;
  resultUrls: string[];
  failMsg: string;
  creditsConsumed?: number;
  progress?: number;
};

function getApiKey(): string {
  const key = process.env.KIE_AI_API_KEY?.trim();
  if (!key) {
    throw new Error("KIE_AI_API_KEY não configurada no servidor.");
  }
  return key;
}

async function kieFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${KIE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  const json = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: T;
  };

  if (!res.ok || (json.code != null && json.code !== 200)) {
    throw new Error(json.msg || `Kie AI erro HTTP ${res.status}`);
  }

  if (json.data == null) {
    throw new Error(json.msg || "Resposta vazia da Kie AI.");
  }

  return json.data;
}

/** Saldo de créditos da conta Kie (API key). Pode ser decimal. */
export async function getKieAccountCredits(): Promise<number> {
  const data = await kieFetch<number>("/api/v1/chat/credit");
  return typeof data === "number" ? data : Number(data) || 0;
}

export async function createKieTask(
  body: KieCreateTaskBody
): Promise<KieCreateTaskResult> {
  const data = await kieFetch<{ taskId: string }>("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { taskId: data.taskId };
}

export async function getKieTaskInfo(taskId: string): Promise<KieTaskInfo> {
  const data = await kieFetch<{
    taskId: string;
    model: string;
    state: KieTaskState;
    resultJson?: string | null;
    failMsg?: string | null;
    creditsConsumed?: number;
    progress?: number;
  }>(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`);

  let resultUrls: string[] = [];
  if (data.resultJson) {
    try {
      const parsed = JSON.parse(data.resultJson) as {
        resultUrls?: string[];
      };
      resultUrls = parsed.resultUrls ?? [];
    } catch {
      resultUrls = [];
    }
  }

  return {
    taskId: data.taskId,
    model: data.model,
    state: data.state,
    resultUrls,
    failMsg: data.failMsg ?? "",
    creditsConsumed: data.creditsConsumed,
    progress: data.progress,
  };
}

export function buildKieInput(opts: {
  modelKey: string;
  kieModel: string;
  prompt: string;
  aspectRatio: string;
  resolution: string;
  referenceUrls: string[];
}): Record<string, unknown> {
  const { modelKey, kieModel, prompt, aspectRatio, resolution, referenceUrls } =
    opts;

  if (kieModel === "gpt-image-2-text-to-image") {
    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: aspectRatio || "auto",
      resolution: resolution || "1K",
    };
    if (modelKey === "logo") {
      input.background = "transparent";
    }
    return input;
  }

  if (kieModel === "gpt-image-2-image-to-image") {
    return {
      prompt,
      input_urls: referenceUrls.slice(0, 16),
      aspect_ratio: aspectRatio || "auto",
      resolution: resolution || "1K",
    };
  }

  if (kieModel === "kling-2.6/image-to-video") {
    if (!referenceUrls[0]) {
      throw new Error("Envie ao menos 1 imagem de referência para vídeo.");
    }
    return {
      prompt,
      image_urls: [referenceUrls[0]],
      sound: false,
      duration: "5",
    };
  }

  if (kieModel === "bytedance/v1-lite-image-to-video") {
    if (!referenceUrls[0]) {
      throw new Error("Envie ao menos 1 imagem de referência para vídeo.");
    }
    return {
      prompt,
      image_url: referenceUrls[0],
      resolution: "720p",
      duration: "5",
      camera_fixed: false,
    };
  }

  return { prompt };
}
