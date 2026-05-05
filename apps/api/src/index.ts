import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import choujinRoute from './routes/choujin.js';

const app = new Hono();

app.get('/', (c) => {
  return c.text('Hello, KinnikumanAPI!');
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// ルーターをマウント
app.route('/api/v1/choujin', choujinRoute);

const port = 3000;
console.log(`🦸 API server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});
