import {
  type AlertEvent,
  type ContractProfile,
  type DomainProfile,
  type EntityProfile,
  type GraphResponse,
  type JurisdictionProfile,
  type SearchResponse,
  type SourceStatus,
  type TimelineEvent,
  type WalletProfile,
  type Watchlist,
} from "@/types/api";

/** Stay under Vercel's default serverless limit so RSC pages don't 504 while waiting on fetch. */
const REQUEST_TIMEOUT_MS = 8_000;

function getApiBase(): string | null {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    return fromEnv;
  }
  // On Vercel, defaulting to localhost makes every server render hang until the platform times out.
  if (process.env.VERCEL) {
    return null;
  }
  return "http://localhost:8000";
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const base = getApiBase();
  if (!base) {
    throw new Error("Set NEXT_PUBLIC_API_BASE_URL to your public API URL (e.g. https://your-api.onrender.com)");
  }
  const response = await fetch(`${base}${path}`, {
    ...init,
    cache: "no-store",
    signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Request failed for ${path}`);
  }
  return response.json() as Promise<T>;
}

export async function safeRequest<T>(path: string, fallback: T, init?: RequestInit): Promise<T> {
  if (!getApiBase()) {
    return fallback;
  }
  try {
    return await request<T>(path, init);
  } catch {
    return fallback;
  }
}

export async function getSources() {
  return safeRequest<SourceStatus[]>("/sources", []);
}

export async function searchRegistry(query: string, limit = 12) {
  return safeRequest<SearchResponse>(`/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
    query,
    results: [],
  });
}

export async function getEntity(id: string) {
  return request<EntityProfile>(`/entity/${id}`);
}

export async function getEntityGraph(id: string) {
  return request<GraphResponse>(`/entity/${id}/graph`);
}

export async function getNodeGraph(nodeType: string, id: string) {
  return request<GraphResponse>(`/graph/${nodeType}/${id}`);
}

export async function getEntityTimeline(id: string) {
  return request<TimelineEvent[]>(`/entity/${id}/timeline`);
}

export async function getContract(chain: string, address: string) {
  return safeRequest<ContractProfile | { detail: string }>(`/check/contract?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address)}`, {
    detail: "source unavailable",
  });
}

export async function getDomain(hostname: string) {
  return safeRequest<DomainProfile | { detail: string }>(`/check/domain?hostname=${encodeURIComponent(hostname)}`, {
    detail: "source unavailable",
  });
}

export async function getWallet(chain: string, address: string) {
  return safeRequest<WalletProfile | { detail: string }>(`/check/wallet?chain=${encodeURIComponent(chain)}&address=${encodeURIComponent(address)}`, {
    detail: "source unavailable",
  });
}

export async function getJurisdiction(code: string) {
  return safeRequest<JurisdictionProfile | { detail: string }>(`/jurisdiction/${encodeURIComponent(code)}`, {
    detail: "source unavailable",
  });
}

export async function getOpenApiDocument() {
  return safeRequest<Record<string, unknown>>("/openapi.json", {});
}

export async function getAlerts(apiKey: string) {
  return request<AlertEvent[]>("/alerts", {
    headers: { "x-api-key": apiKey },
  });
}

export async function getWatchlists(apiKey: string) {
  return request<Watchlist[]>("/watchlists", {
    headers: { "x-api-key": apiKey },
  });
}

export async function createWatchlist(apiKey: string, payload: Record<string, unknown>) {
  return request<{ id: string; label?: string | null; target_type: string }>("/watchlists", {
    method: "POST",
    headers: { "x-api-key": apiKey },
    body: JSON.stringify(payload),
  });
}
