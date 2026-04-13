import {
  type AlertEvent,
  type EntityProfile,
  type GraphResponse,
  type SourceStatus,
  type TimelineEvent,
  type Watchlist,
} from "@/types/api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    cache: "no-store",
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
  try {
    return await request<T>(path, init);
  } catch {
    return fallback;
  }
}

export async function getSources() {
  return safeRequest<SourceStatus[]>("/sources", []);
}

export async function getEntity(id: string) {
  return request<EntityProfile>(`/entity/${id}`);
}

export async function getEntityGraph(id: string) {
  return request<GraphResponse>(`/entity/${id}/graph`);
}

export async function getEntityTimeline(id: string) {
  return request<TimelineEvent[]>(`/entity/${id}/timeline`);
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
