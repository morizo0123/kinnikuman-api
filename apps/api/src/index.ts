import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import choujinRoute from './routes/choujin.js';
import factionRoute from './routes/faction.js';
import choujinV2Route from './routes/choujin-v2.js';
import factionV2Route from './routes/faction-v2.js';

const app = new OpenAPIHono();

// OpenAPI JSON 仕様書
app.doc('/doc/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'KinnikumanAPI',
    description: 'キン肉マンに登場するキャラクター情報の REST API'
  }
});

// Swagger UI
app.get('/doc', swaggerUI({ url: '/doc/openapi.json' }));

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
app.route('/api/v2/faction', factionV2Route);

const port = 3000;
console.log(`🦸 API server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});

export type AppType = typeof app;
