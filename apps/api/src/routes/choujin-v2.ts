import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { choujin, choujinFaction, faction } from '../db/schema.js';

const app = new OpenAPIHono();

// 1. パラメータスキーマ
const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(10),
  offset: z.coerce.number().int().min(0).default(0),
  faction: z.string().optional()
});

// 2. レスポンススキーマ
const ChoujinItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  url: z.string()
});

const ListResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(ChoujinItemSchema)
});

// 3. ルート定義(スキーマとハンドラを分離)
const route = createRoute({
  method: 'get',
  path: '/',
  tags: ['Choujin'],
  summary: '超人一覧を取得',
  request: {
    query: QuerySchema
  },
  responses: {
    200: {
      content: {
        'application/json': {
          schema: ListResponseSchema
        }
      },
      description: '超人一覧'
    }
  }
});

// 4. ハンドラで実装
app.openapi(route, async (c) => {
  const { limit, offset, faction: factionSlug } = c.req.valid('query');

  // 絞り込み対象の choujin id を取得(faction 指定時のみ)
  let filteredIds: number[] | null = null;
  if (factionSlug) {
    const ids = await db
      .select({ id: choujin.id })
      .from(choujin)
      .innerJoin(choujinFaction, eq(choujin.id, choujinFaction.choujinId))
      .innerJoin(faction, eq(choujinFaction.factionId, faction.id))
      .where(eq(faction.slug, factionSlug));
    filteredIds = ids.map((r) => r.id);
  }

  // count 取得
  const [{ count }] =
    filteredIds !== null
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(choujin)
          .where(inArray(choujin.id, filteredIds))
      : await db.select({ count: sql<number>`count(*)` }).from(choujin);

  // データ取得
  const rows =
    filteredIds !== null
      ? await db
          .select()
          .from(choujin)
          .where(inArray(choujin.id, filteredIds))
          .limit(limit)
          .offset(offset)
      : await db.select().from(choujin).limit(limit).offset(offset);

  // next / previous URL 計算
  const queryString = factionSlug ? `?faction=${factionSlug}` : '';
  const baseUrl = `/api/v2/choujin${queryString}`;
  const separator = baseUrl.includes('?') ? '&' : '?';

  const next =
    offset + limit < count
      ? `${baseUrl}${separator}limit=${limit}&offset=${offset + limit}`
      : null;

  const previous =
    offset > 0
      ? `${baseUrl}${separator}limit=${limit}&offset=${Math.max(offset - limit, 0)}`
      : null;

  return c.json({
    count,
    next,
    previous,
    results: rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      url: `/api/v2/choujin/${row.slug}`
    }))
  });
});

export default app;
