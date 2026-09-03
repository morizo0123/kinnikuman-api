import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { faction } from '../db/schema.js';

const app = new OpenAPIHono();

// === スキーマ定義 ===
const QuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0)
});

const FactionItemSchema = z.object({
  slug: z.string(),
  name: z.string(),
  url: z.string()
});

const ListResponseSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(FactionItemSchema)
});

const FactionDetailSchema = z.object({
  slug: z.string(),
  name: z.string(),
  choujins: z.array(
    z.object({
      slug: z.string(),
      name: z.string(),
      url: z.string()
    })
  )
});

const ErrorSchema = z.object({
  error: z.string()
});

const SlugParamSchema = z.object({
  slug: z.string()
});

// === List ===
const listRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['Faction'],
  summary: '軍団一覧を取得',
  request: { query: QuerySchema },
  responses: {
    200: {
      content: { 'application/json': { schema: ListResponseSchema } },
      description: '軍団一覧'
    }
  }
});

app.openapi(listRoute, async (c) => {
  const { limit, offset } = c.req.valid('query');

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(faction);

  const rows = await db.select().from(faction).limit(limit).offset(offset);

  const baseUrl = '/api/v2/faction';
  const next =
    offset + limit < count
      ? `${baseUrl}?limit=${limit}&offset=${offset + limit}`
      : null;
  const previous =
    offset > 0
      ? `${baseUrl}?limit=${limit}&offset=${Math.max(offset - limit, 0)}`
      : null;

  return c.json({
    count,
    next,
    previous,
    results: rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      url: `/api/v2/faction/${row.slug}`
    }))
  });
});

// === Detail ===
const detailRoute = createRoute({
  method: 'get',
  path: '/{slug}',
  tags: ['Faction'],
  summary: '軍団詳細を取得',
  request: { params: SlugParamSchema },
  responses: {
    200: {
      content: { 'application/json': { schema: FactionDetailSchema } },
      description: '軍団詳細'
    },
    404: {
      content: { 'application/json': { schema: ErrorSchema } },
      description: '見つからない'
    }
  }
});

app.openapi(detailRoute, async (c) => {
  const { slug } = c.req.valid('param');

  const row = await db.query.faction.findFirst({
    where: eq(faction.slug, slug),
    with: {
      choujins: {
        with: { choujin: true }
      }
    }
  });

  if (!row) {
    return c.json({ error: 'Faction not found' }, 404);
  }

  return c.json(
    {
      slug: row.slug,
      name: row.name,
      choujins: row.choujins.map((cf) => ({
        slug: cf.choujin.slug,
        name: cf.choujin.name,
        url: `/api/v2/choujin/${cf.choujin.slug}`
      }))
    },
    200
  );
});

export default app;
