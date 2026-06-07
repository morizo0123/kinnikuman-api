import type {
  ChoujinDetail,
  ChoujinListItem,
  FactionDetail,
  FactionListItem,
  PaginatedResponse
} from './types';

const BASE_URL = import.meta.env.VITE_API_URL;

// === fetch のラッパー ===
async function apiFetch<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<T>;
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
