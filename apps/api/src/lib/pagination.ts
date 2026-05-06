import type { Context } from 'hono';

/**
 * Hono Context からページネーションパラメータを取得する
 */
export function parsePaginationParams(c: Context) {
  const limitParam = c.req.query('limit');
  const offsetParam = c.req.query('offset');

  // デフォルト値を設定。範囲外も補正
  const limit = clamp(parseIntSafe(limitParam, 20), 1, 100);
  const offset = Math.max(parseIntSafe(offsetParam, 0), 0);

  return { limit, offset };
}

/**
 * ページネーション付きレスポンスを組み立てる
 */
export function buildPaginatedResponse<T>(params: {
  baseUrl: string; // 例: '/api/v1/choujin'
  count: number; // 全件数
  limit: number;
  offset: number;
  results: T[];
}) {
  const { baseUrl, count, limit, offset, results } = params;

  const next =
    offset + limit < count
      ? `${baseUrl}?limit=${limit}&offset=${offset + limit}`
      : null;

  const previousOffset = Math.max(offset - limit, 0);
  const previous =
    offset > 0 ? `${baseUrl}?limit=${limit}&offset=${previousOffset}` : null;

  return { count, next, previous, results };
}

// ヘルパー関数
function parseIntSafe(value: string | undefined, fallback: number): number {
  if (value === undefined) return fallback;
  const n = parseInt(value, 10);
  return isNaN(n) ? fallback : n;
}

/**
 * 「この範囲に収める」関数
 * clamp(150, 1, 100) // → 100
 * clamp(-5, 1, 100)  // → 1
 * clamp(50, 1, 100)  // → 50
 */
function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}
