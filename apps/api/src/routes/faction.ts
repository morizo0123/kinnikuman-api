import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { faction } from '../db/schema.js';

const app = new Hono();

// GET /api/v1/faction - 軍団一覧
app.get('/', async (c) => {
  const rows = await db.select().from(faction);

  return c.json({
    count: rows.length,
    results: rows.map((row) => ({
      slug: row.slug,
      name: row.name,
      url: `/api/v1/faction/${row.slug}`
    }))
  });
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
