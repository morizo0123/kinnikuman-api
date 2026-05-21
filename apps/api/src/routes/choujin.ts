import { Hono } from 'hono';
import { eq, sql, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { choujin, choujinFaction, faction } from '../db/schema.js';
import {
  parsePaginationParams,
  buildPaginatedResponse
} from '../lib/pagination.js';

const app = new Hono();

// GET /api/v1/choujin?faction=seigi - 超人一覧(ページネーション付き)
app.get('/', async (c) => {
  const { limit, offset } = parsePaginationParams(c);
  const factionSlug = c.req.query('faction');

  // 絞り込み対象の choujin id を取得(指定されてなければ null)
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

  // count 取得(条件あり/なしで分岐)
  const [{ count }] =
    filteredIds !== null
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(choujin)
          .where(inArray(choujin.id, filteredIds))
      : await db.select({ count: sql<number>`count(*)` }).from(choujin);

  // データ取得(条件あり/なしで分岐)
  const rows =
    filteredIds !== null
      ? await db
          .select()
          .from(choujin)
          .where(inArray(choujin.id, filteredIds))
          .limit(limit)
          .offset(offset)
      : await db.select().from(choujin).limit(limit).offset(offset);

  // baseUrl にクエリ条件を埋め込み(next/previous で維持)
  const queryString = factionSlug ? `?faction=${factionSlug}` : '';
  const baseUrl = `/api/v1/choujin${queryString}`;

  return c.json(
    buildPaginatedResponse({
      baseUrl,
      count,
      limit,
      offset,
      results: rows.map((row) => ({
        slug: row.slug,
        name: row.name,
        url: `/api/v1/choujin/${row.slug}`
      }))
    })
  );
});

// GET /api/v1/choujin/:slug - 超人詳細
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');

  const row = await db.query.choujin.findFirst({
    where: eq(choujin.slug, slug),
    with: {
      factions: {
        with: {
          faction: true
        }
      }
    }
  });

  if (!row) {
    return c.json({ error: 'Choujin not found' }, 404);
  }

  return c.json({
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
      url: `/api/v1/faction/${cf.faction.slug}`
    }))
  });
});

export default app;
