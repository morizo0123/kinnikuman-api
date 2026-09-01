import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import choujinRoute from './routes/choujin.js';
import factionRoute from './routes/faction.js';
import choujinV2Route from './routes/choujin-v2.js';

const app = new Hono();

// CORS 設定(開発中は localhost:5173 を許可)
app.use(
  '/*',
  cors({
    origin: 'http://localhost:5173'
  })
);

app.get('/', (c) => {
  return c.text('Hello, KinnikumanAPI!');
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// ルーターをマウント
app.route('/api/v1/choujin', choujinRoute);
app.route('/api/v1/faction', factionRoute);
app.route('/api/v2/choujin', choujinV2Route);

const port = 3000;
console.log(`🦸 API server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
