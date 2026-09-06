import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
import { serve } from '@hono/node-server';
import { cors } from 'hono/cors';
import choujinRoute from './routes/choujin.js';
import factionRoute from './routes/faction.js';
import choujinV2Route from './routes/choujin-v2.js';
import factionV2Route from './routes/faction-v2.js';

const app = new OpenAPIHono();

app.use(
  '/*',
  cors({
    origin: 'http://localhost:5273'
  })
);

app.get('/', (c) => {
  return c.text('Hello, KinnikumanAPI!');
});

app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// ルーターをマウント
const routes = app
  .route('/api/v1/choujin', choujinRoute)
  .route('/api/v1/faction', factionRoute)
  .route('/api/v2/choujin', choujinV2Route)
  .route('/api/v2/faction', factionV2Route);

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

const port = 3000;
console.log(`🦸 API server running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port
});

export type AppType = typeof routes;
