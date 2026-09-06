import { hc } from 'hono/client';
import type { AppType } from 'api';
import type {
  ChoujinDetail,
  ChoujinListItem,
  FactionDetail,
  FactionListItem,
  PaginatedResponse
} from './types';

const client = hc<AppType>(import.meta.env.VITE_API_URL);

// メタ情報付きレスポンスの型
export type ApiResponse<T> = {
  data: T;
  status: number;
  statusText: string;
  durationMs: number;
};

const BASE_URL = import.meta.env.VITE_API_URL;

// === fetch のラッパー ===
async function apiFetch<T>(path: string): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const start = performance.now();
  const res = await fetch(url);
  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).durationMs = durationMs;
    throw error;
  }

  const data = (await res.json()) as T;
  return {
    data,
    status: res.status,
    statusText: res.statusText,
    durationMs
  };
}

// === Choujin ===
export async function fetchChoujinList(params?: {
  limit?: number;
  offset?: number;
  faction?: string;
}): Promise<ApiResponse<PaginatedResponse<ChoujinListItem>>> {
  const start = performance.now();

  const query: Record<string, string> = {};
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.offset !== undefined) query.offset = String(params.offset);
  if (params?.faction) query.faction = params.faction;

  const res = await client.api.v2.choujin.$get({ query });

  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).durationMs = durationMs;
    throw error;
  }

  const data = await res.json();
  return {
    data: data as PaginatedResponse<ChoujinListItem>,
    status: res.status,
    statusText: res.statusText,
    durationMs
  };
}

export async function fetchChoujinDetail(
  slug: string
): Promise<ApiResponse<ChoujinDetail>> {
  const start = performance.now();

  const res = await client.api.v2.choujin[':slug'].$get({
    param: { slug }
  });

  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).durationMs = durationMs;
    throw error;
  }

  const data = await res.json();
  return {
    data: data as ChoujinDetail,
    status: res.status,
    statusText: res.statusText,
    durationMs
  };
}

// === Faction ===
export async function fetchFactionList(params?: {
  limit?: number;
  offset?: number;
}): Promise<ApiResponse<PaginatedResponse<FactionListItem>>> {
  const start = performance.now();

  const query: Record<string, string> = {};
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.offset !== undefined) query.offset = String(params.offset);

  const res = await client.api.v2.faction.$get({ query });

  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).durationMs = durationMs;
    throw error;
  }

  const data = await res.json();
  return {
    data: data as PaginatedResponse<FactionListItem>,
    status: res.status,
    statusText: res.statusText,
    durationMs
  };
}

export async function fetchFactionDetail(
  slug: string
): Promise<ApiResponse<FactionDetail>> {
  // return apiFetch<FactionDetail>(`/api/v1/faction/${slug}`);
  const start = performance.now();

  const res = await client.api.v2.faction[':slug'].$get({
    param: { slug }
  });

  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).durationMs = durationMs;
    throw error;
  }

  const data = await res.json();
  return {
    data: data as FactionDetail,
    status: res.status,
    statusText: res.statusText,
    durationMs
  };
}
