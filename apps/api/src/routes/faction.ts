import { Hono } from 'hono';
import { eq, sql } from 'drizzle-orm';
import { db } from '../db/index.js';
import { faction } from '../db/schema.js';
import {
  parsePaginationParams,
  buildPaginatedResponse
} from '../lib/pagination.js';

const app = new Hono();

// GET /api/v1/faction - 軍団一覧(ページネーション付き)
app.get('/', async (c) => {
  const { limit, offset } = parsePaginationParams(c);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(faction);

  // ページ分のデータを取得
  const rows = await db.select().from(faction).limit(limit).offset(offset);

  return c.json(
    buildPaginatedResponse({
      baseUrl: '/api/v1/faction',
      count,
      limit,
      offset,
      results: rows.map((row) => ({
        slug: row.slug,
        name: row.name,
        url: `/api/v1/faction/${row.slug}`
      }))
    })
  );
});

// GET /api/v1/faction/:slug - 軍団詳細
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');

  const row = await db.query.faction.findFirst({
    where: eq(faction.slug, slug),
    with: {
      choujins: {
        with: {
          choujin: true
        }
      }
    }
  });

  if (!row) {
    return c.json({ error: 'Faction not found' }, 404);
  }

  return c.json({
    slug: row.slug,
    name: row.name,
    choujins: row.choujins.map((cf) => ({
      slug: cf.choujin.slug,
      name: cf.choujin.name,
      url: `/api/v1/choujin/${cf.choujin.slug}`
    }))
  });
});

export default app;
