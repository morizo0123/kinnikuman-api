import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { choujin, choujinFaction, faction } from '../db/schema.js';

const app = new OpenAPIHono();

// 1. パラメータスキーマ
const QuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('1ページあたりの取得件数(1〜100)')
    .openapi({ example: 20 }),
  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0)
    .describe('スキップする件数(ページング用)')
    .openapi({ example: 0 }),
  faction: z
    .string()
    .optional()
    .describe('軍団 slug で絞り込み(例: seigi)')
    .openapi({ example: 'seigi' })
});

// 2. レスポンススキーマ
const ChoujinItemSchema = z.object({
  slug: z.string().describe('超人の識別子').openapi({ example: 'kinnikuman' }),
  name: z.string().describe('超人名').openapi({ example: 'キン肉マン' }),
  url: z.string().describe('詳細エンドポイントの URL')
});

const ListResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(ChoujinItemSchema)
});

const ChoujinDetailSchema = z.object({
  slug: z.string(),
  name: z.string(),
  real_name: z.string().nullable(),
  power: z.string().nullable(),
  origin: z.string().nullable(),
  height_cm: z.number().nullable(),
  weight_kg: z.number().nullable(),
  description: z.string().nullable(),
  factions: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      url: z.string()
    })
  )
});

// エラーレスポンス用(404 とか)
const ErrorSchema = z.object({
  error: z.string()
});

// Path パラメータ用
const SlugParamSchema = z.object({
  slug: z
    .string()
    .describe('超人の一意な識別子(slug)')
    .openapi({ example: 'kinnikuman' })
});

// 3. ルート定義(スキーマとハンドラを分離)
const route = createRoute({
  method: 'get',
  path: '/',
  tags: ['Choujin'],
  summary: '超人一覧を取得',
  description:
    '登録されている全ての超人を、ページネーション付きで取得します。' +
    '`faction` クエリを指定すると、特定の軍団に所属する超人のみに絞り込めます。',
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

const detailRoute = createRoute({
  method: 'get',
  path: '/{slug}',
  tags: ['Choujin'],
  summary: '超人詳細を取得',
  description:
    '指定された slug の超人の詳細情報を取得します。所属軍団のリストも含みます。',
  request: {
    params: SlugParamSchema
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: ChoujinDetailSchema }
      },
      description: '超人詳細'
    },
    404: {
      content: {
        'application/json': { schema: ErrorSchema }
      },
      description: '見つからない'
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

app.openapi(detailRoute, async (c) => {
  const { slug } = c.req.valid('param');

  const row = await db.query.choujin.findFirst({
    where: eq(choujin.slug, slug),
    with: {
      factions: {
        with: { faction: true }
      }
    }
  });

  if (!row) {
    return c.json({ error: 'Choujin not found' }, 404);
  }

  return c.json(
    {
      slug: row.slug,
      name: row.name,
      real_name: row.realName,
      power: row.power,
      origin: row.origin,
      height_cm: row.heightCm,
      weight_kg: row.weightKg,
      description: row.description,
      factions: row.factions.map((cf) => ({
        slug: cf.faction.slug,
        name: cf.faction.name,
        url: `/api/v2/faction/${cf.faction.slug}`
      }))
    },
    200
  );
});

export default app;
