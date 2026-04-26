# 開発ノート

## 環境構築

### Node.js

- nodenv 使用、v24.15.0 採用
- v25 系は Corepack 同梱なし → 避ける
- nodenv はバージョン切替時にグローバルパッケージ再インストールが必要

### pnpm

- v10.33.2、Corepack 経由でインストール
- `corepack enable && corepack prepare pnpm@latest --activate`
- 署名鍵エラー時は `npm i -g corepack@latest`

### モノレポ構成

- pnpm workspace
- `apps/api`(Hono)、`apps/web`(React 予定)、`packages/shared`(共通型 予定)
- ルート `package.json` は `private: true`
- `pnpm-workspace.yaml` で `apps/*`, `packages/*` を指定
- `pnpm --filter <name> <cmd>` で各 workspace のスクリプト実行

---

## バックエンド (apps/api)

### 技術スタック

- TypeScript + Hono + @hono/node-server
- 開発実行: tsx watch(ホットリロード)
- DB: Turso(libSQL)
- ORM: Drizzle ORM

### Hono 基本

- `app.get(path, c => c.json(...))` でルート定義
- `serve({ fetch: app.fetch, port })` で起動
- `package.json` に `"type": "module"` 必須

### tsconfig.json 要点

- `"strict": true`
- `"module": "ESNext"`, `"moduleResolution": "Bundler"`
- `"target": "ES2022"`
- `"types": ["node"]` ← ないと `process` が型エラー
- `"include"` に src/ 外のファイル(drizzle.config.ts 等)も明示

### Turso セットアップ

- CLI: `curl -sSfL https://get.tur.so/install.sh | bash`
  - Homebrew tap (`brew install tursodatabase/tap/turso`) は依存解決でコケることあり
- `turso auth login` → `turso db create kinnikuman`
- URL: `turso db show kinnikuman --url`
- Token: `turso db tokens create kinnikuman`

### 環境変数

- `apps/api/.env` に `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`
- `.env.example` は Git に入れる、`.env` は `.gitignore`

### Drizzle 構成

- `drizzle.config.ts` — schema パス、out 先、dialect、認証情報
- `src/db/index.ts` — libSQL クライアント生成 → `drizzle(client)` で ORM
- 利用は `import { db } from './db'`

---

## ハマりポイント

- Corepack 署名鍵エラー → `npm i -g corepack@latest`
- nodenv で `pnpm: command not found` → 切替後の Node に再インストール
- TS `process` 不明 → tsconfig の `types` に `"node"` 追加
- Turso CLI curl 失敗 → リトライで通ることも

## コード解説

`apps/api/src/index.ts`

- new Hono() — アプリケーションインスタンスを作成
- app.get(path, handler) — GET リクエストのルートを定義
- c は Context オブジェクト。リクエスト情報の取得やレスポンスの生成を担当
- c.text() / c.json() — それぞれテキスト/JSON でレスポンスを返すヘルパー
- serve() — @hono/node-server が提供。Hono の fetch ハンドラを Node のHTTPサーバーで動かす

`Drizzle ORM`

ORM(Object-Relational Mapper)は、SQLを直接書く代わりに、TS/JSのコードでDBを操作できるツールです。

```ts
// 生SQL
db.execute('SELECT * FROM choujin WHERE slug = ?', ['kinnikuman']);

// Drizzle
db.select().from(choujin).where(eq(choujin.slug, 'kinnikuman'));
```

### Drizzle の良いところ:

- 型推論が強い — テーブル定義から自動で型が生まれる
- SQL に近い — 「魔法」が少ないので、生SQLの理解にも繋がる(学習向き)
- マイグレーション機能 — スキーマ変更を SQL ファイルに自動変換
- 軽量 — Prisma みたいに別プロセスを立ち上げない

### 何をやるか

1. Drizzle と libSQL クライアントをインストール
2. .env ファイルに Turso の接続情報を書く
3. Drizzle の設定ファイルを作る
4. DB接続を行うクライアントコードを書く

`drizzle-ormORM` 本体。SQL クエリビルダ + 型生成
`@libsql/client` Turso(libSQL)に接続するためのクライアント
`drizzle-kit` スキーマ → SQL マイグレーション生成、Drizzle Studio などのCLIツール
`dotenv` .env ファイルから環境変数を読み込むツール
