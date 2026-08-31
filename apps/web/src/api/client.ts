import type {
  ChoujinDetail,
  ChoujinListItem,
  FactionDetail,
  FactionListItem,
  PaginatedResponse
} from './types';

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
export function fetchChoujinList(params?: {
  limit?: number;
  offset?: number;
  faction?: string;
}) {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));
  if (params?.faction) query.set('faction', params.faction);

  const queryString = query.toString();
  const path = `/api/v1/choujin${queryString ? `?${queryString}` : ''}`;

  return apiFetch<PaginatedResponse<ChoujinListItem>>(path);
}

export function fetchChoujinDetail(slug: string) {
  return apiFetch<ChoujinDetail>(`/api/v1/choujin/${slug}`);
}

// === Faction ===
export function fetchFactionList(params?: { limit?: number; offset?: number }) {
  const query = new URLSearchParams();
  if (params?.limit !== undefined) query.set('limit', String(params.limit));
  if (params?.offset !== undefined) query.set('offset', String(params.offset));

  const queryString = query.toString();
  const path = `/api/v1/faction${queryString ? `?${queryString}` : ''}`;

  return apiFetch<PaginatedResponse<FactionListItem>>(path);
}

export function fetchFactionDetail(slug: string) {
  return apiFetch<FactionDetail>(`/api/v1/faction/${slug}`);
}
