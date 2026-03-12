const TINYFISH_BASE = "https://agent.tinyfish.ai/v1";

export interface RunAsyncBody {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: { enabled: boolean; country_code?: string };
  api_integration?: string;
}

export interface RunAsyncResponse {
  run_id: string | null;
  error: { code: string; message: string } | null;
}

export interface RunStatusResponse {
  run_id: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  result?: unknown;
  error?: { code: string; message: string };
  streamingUrl?: string;
}

export interface RunSyncResponse {
  run_id?: string;
  status?: string;
  result?: unknown;
  error?: { code: string; message: string };
  streamingUrl?: string;
}

export async function startRunAsync(body: RunAsyncBody): Promise<RunAsyncResponse> {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("TINYFISH_API_KEY is not set");

  const res = await fetch(`${TINYFISH_BASE}/automation/run-async`, {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: body.url,
      goal: body.goal,
      browser_profile: body.browser_profile ?? "stealth",
      proxy_config: body.proxy_config,
      api_integration: body.api_integration ?? "glider",
    }),
  });

  const data = (await res.json()) as RunAsyncResponse & { error?: { code: string; message: string } };
  if (!res.ok) {
    const err = data.error ?? { code: "UNKNOWN", message: "TinyFish request failed" };
    throw new Error(err.message || err.code);
  }
  return data;
}

export async function runSync(body: RunAsyncBody): Promise<RunSyncResponse> {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("TINYFISH_API_KEY is not set");

  const res = await fetch(`${TINYFISH_BASE}/automation/run`, {
    method: "POST",
    headers: {
      "X-API-Key": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: body.url,
      goal: body.goal,
      browser_profile: body.browser_profile ?? "lite",
      proxy_config: body.proxy_config,
      api_integration: body.api_integration ?? "glider",
    }),
  });

  const data = (await res.json()) as RunSyncResponse;
  if (!res.ok) {
    const err = (data as any)?.error ?? { code: "UNKNOWN", message: "TinyFish request failed" };
    throw new Error(err.message || err.code);
  }
  return data;
}

export async function getRunStatus(runId: string): Promise<RunStatusResponse> {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("TINYFISH_API_KEY is not set");

  const res = await fetch(`${TINYFISH_BASE}/runs/${runId}`, {
    headers: { "X-API-Key": key },
  });

  if (!res.ok) {
    const err = (await res.json()).error ?? {};
    throw new Error(err.message || "Failed to get run status");
  }
  return res.json();
}
