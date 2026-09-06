# 🦸 KinnikumanAPI

キン肉マンに登場するキャラクター情報を取得できる REST API。
[PokéAPI](https://pokeapi.co/) に着想を得て作った **個人学習プロジェクト** です。

> **⚠️ 注意**: このプロジェクトはフルスタック TypeScript の学習を目的としたもので、公開・商用利用は想定していません。『キン肉マン』はゆでたまご先生の作品であり、集英社より刊行されています。本サイトはファンによる非公式の学習プロジェクトです。

## 🎯 このプロジェクトの目的

**バックエンド未経験のフロントエンドエンジニアが、ゼロから REST API とドキュメントサイトを作る**ことで、フルスタック開発の一連の流れを体験することを目的としています。

- DB スキーマ設計から API 実装、フロントエンド、デザインまで自作
- スキーマ駆動開発の実践(Zod + OpenAPI)
- BE と FE の型共有(Hono RPC)

## 🌟 主な機能

### API
- **超人 (Choujin)**: キン肉マンやテリーマンなど登場超人の情報を取得
- **軍団 (Faction)**: 正義超人、悪魔超人などの軍団単位でメンバーを取得
- ページネーション、絞り込み、多対多リレーション対応

### ドキュメントサイト
- **手作りのドキュメントページ** (Stripe/Vercel を参考にしたデザイン)
- **Try it 機能** — 画面上でパラメータを変えて API を叩ける
- **curl コマンド表示** — リアルタイム更新
- **HTTP ステータスバッジ + レスポンスタイム表示**
- **ダークモード** (Light / Dark / System の 3 状態、OS 追従)
- **Swagger UI** — Zod スキーマから自動生成された API 仕様書

## 🛠 技術スタック

### バックエンド

| 技術 | 用途 | 選定理由 |
|---|---|---|
| **TypeScript** | 言語 | 型安全なフルスタック開発 |
| **[Hono](https://hono.dev/)** | Web フレームワーク | 軽量・型安全・エッジで動く。Hono RPC で FE と型共有できる |
| **[Drizzle ORM](https://orm.drizzle.team/)** | ORM | SQL に近い書き味と型安全性の両立 |
| **[Turso](https://turso.tech/) (libSQL)** | データベース | SQLite ベース、Edge に強い、無料枠が十分 |
| **[Zod](https://zod.dev/)** | バリデーション | 実行時型検証。スキーマ駆動開発の中核 |
| **[@hono/zod-openapi](https://github.com/honojs/middleware/tree/main/packages/zod-openapi)** | OpenAPI 生成 | 1 つの Zod スキーマから型・バリデーション・仕様書を導出 |

### フロントエンド

| 技術 | 用途 | 選定理由 |
|---|---|---|
| **React + Vite** | UI フレームワーク | モダンで高速な開発体験 |
| **TypeScript** | 言語 | BE と共通、型を FE まで伝搬 |
| **[shadcn/ui](https://ui.shadcn.com/)** | UI コンポーネント | Radix ベース、Tailwind ベース、コード所有型 |
| **[Tailwind CSS v4](https://tailwindcss.com/)** | スタイル | ユーティリティファースト、shadcn との相性◎ |
| **[TanStack Query](https://tanstack.com/query)** | サーバー状態管理 | キャッシュ、再取得、ローディング状態を自動化 |
| **[React Router](https://reactrouter.com/)** | ルーティング | SPA ナビゲーション、実績と情報量 |
| **[lucide-react](https://lucide.dev/)** | アイコン | shadcn 推奨、軽量、SVG ネイティブ |

### インフラ・ツール

| 技術 | 用途 |
|---|---|
| **pnpm workspaces** | モノレポ管理 |
| **[Hono RPC (hc)](https://hono.dev/docs/guides/rpc)** | BE↔FE 型共有 |

## 🏗 アーキテクチャ

### モノレポ構成

```
kinnikuman-api/
├── apps/
│   ├── api/          # バックエンド(Hono + Drizzle + Turso)
│   │   └── src/
│   │       ├── db/          # DB スキーマとクライアント
│   │       ├── routes/      # v1(手書き)と v2(Zod OpenAPI)
│   │       └── seed/        # シードデータ
│   └── web/          # フロントエンド(React + Vite)
│       └── src/
│           ├── api/         # API クライアント(hc ベース)
│           ├── components/  # UI コンポーネント
│           ├── pages/       # ページ(Home、Docs、About)
│           └── hooks/       # カスタムフック
├── memo/             # 開発メモ(学習の記録)
└── pnpm-workspace.yaml
```

### スキーマ駆動開発の流れ

```
BE で 1 つの Zod スキーマを書く
     ├→ TypeScript 型(自動)
     ├→ ランタイムバリデーション(自動)
     ├→ OpenAPI 仕様書 (自動、/doc/openapi.json)
     ├→ Swagger UI (自動、/doc)
     └→ FE に型を共有(Hono RPC 経由)
```

**BE を変えれば FE の型が自動追従する**フルスタック TypeScript を実現しています。
