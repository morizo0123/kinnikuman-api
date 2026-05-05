import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { choujin } from '../db/schema.js';

const app = new Hono();

// GET /api/v1/choujin - 超人一覧
app.get('/', async (c) => {
  const rows = await db.select().from(choujin);

  return c.json({
    count: rows.length,
    results: rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      url: `/api/v1/choujin/${row.slug}`
    }))
  });
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
