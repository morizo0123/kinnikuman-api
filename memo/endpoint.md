# エンドポイント実装メモ

## ルーター分離の方針

- `src/routes/<resource>.ts` にリソース単位で分割
- `index.ts` で `app.route('/api/v1/choujin', choujinRoute)` でマウント
- ルーター内では `/` 起点で書く(マウント時にプレフィックスが付く)
- 巨大な `index.ts` を防ぐ、PokéAPI の構成も同じパターン

---

## 一覧エンドポイント

### 例: `GET /api/v1/choujin`

```ts
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
```

### ポイント

- 一覧は **詳細ページへの URL を返す**(REST 設計の定石)
- `count` と `results` の構造は PokéAPI に合わせている
- 一覧では `with` を使わず軽く取得 → パフォーマンス重視

---

## 詳細エンドポイント (リレーション展開)

### 例: `GET /api/v1/choujin/:slug`

```ts
app.get('/:slug', async (c) => {
  const slug = c.req.param('slug');

  const row = await db.query.choujin.findFirst({
    where: eq(choujin.slug, slug),
    with: {
      factions: { with: { faction: true } }
    }
  });

  if (!row) {
    return c.json({ error: 'Choujin not found' }, 404);
  }

  return c.json({
    slug: row.slug,
    name: row.name,
    factions: row.factions.map((cf) => ({
      slug: cf.faction.slug,
      name: cf.faction.name,
      url: `/api/v1/faction/${cf.faction.slug}`
    }))
  });
});
```

### ポイント

- `c.req.param('slug')` で URL パラメータ取得
- `db.query.xxx.findFirst` + `with` でリレーションごと取得
- `with` のネストで「中間テーブル → 実体テーブル」を辿る
- 見つからない場合は 404 で `c.json(body, 404)`

---

## `db.query` を使うための準備

`db/index.ts` で schema を渡す必要がある:

```ts
import * as schema from './schema.js';
export const db = drizzle(client, { schema });
```

これがないと `db.query.xxx` が使えない、TS 型補完も効かない。

---

## 取得と整形は別レイヤー

### 段階1: DB から取る (Drizzle)

- `with` で JOIN して取得するか決める
- 取得しないと、後で参照できない

### 段階2: JSON に整形して返す (Hono)

- `c.json({...})` の引数で何を含めるか決める
- 取得したものを含めない選択も可能

DB ──(with)──→ row オブジェクト ──(c.json)──→ JSON レスポンス

「取得」と「外に出す」を分けて考えると、設計が柔軟になる。

---

## SQL は宣言的 (Declarative)

- `eq(choujin.slug, slug)` は SQL の `WHERE slug = ?` に変換される
- 「**こうやって探せ**」ではなく「**こういうのが欲しい**」を書く
- 探し方は DB のクエリプランナが決める
- `.unique()` を付けたカラムは自動でインデックスが作られて高速検索可能

---

## レスポンス整形のパターン

中間テーブル経由の生データを、API として綺麗な形に変換:

```ts
factions: row.factions.map((cf) => ({
  slug: cf.faction.slug,
  name: cf.faction.name,
  url: `/api/v1/faction/${cf.faction.slug}`
}));
```

- DB の構造をそのまま返さず、**API として読みやすい形**にする
- `url` フィールドで関連リソースへの導線を作る (HATEOAS 的)
- snake_case で返す (`real_name` etc.) — JS の慣習(camelCase)とは別、API は別言語からも叩かれるため

---

## ステータスコード

| 状況                 | コード | 用途                   |
| -------------------- | ------ | ---------------------- |
| 成功 (取得)          | 200    | デフォルト             |
| 見つからない         | 404    | `c.json({error}, 404)` |
| バリデーションエラー | 400    | 後で実装               |
| サーバーエラー       | 500    | 例外時                 |

---

## 動作確認

```bash
# 一覧
curl http://localhost:3000/api/v1/choujin

# 詳細
curl http://localhost:3000/api/v1/choujin/kinnikuman

# 404 確認
curl -i http://localhost:3000/api/v1/choujin/nonexistent

# JSON 整形
curl -s http://localhost:3000/api/v1/choujin | jq .
```

---

## URL 設計パターン (PokéAPI 風)

| HTTP | URL                                | 意味        |
| ---- | ---------------------------------- | ----------- |
| GET  | `/api/v1/<resource>`               | 一覧        |
| GET  | `/api/v1/<resource>/:slug`         | 詳細        |
| GET  | `/api/v1/<resource>?faction=seigi` | 検索 (将来) |

- 動詞は使わない (`/getChoujin` ❌)
- リソース名は複数形/単数形どちらでも可、プロジェクト内で統一
- 識別子は ID ではなく **slug**(URL に意味が出る、変わらない、覚えやすい)

---

## 実装フロー (新しいエンドポイントを追加するとき)

1. `src/routes/<resource>.ts` を作成 or 編集
2. `app.get(path, handler)` でルート定義
3. `index.ts` で `app.route('/api/v1/...', router)` でマウント
4. `pnpm dev` で自動再起動 → curl で確認
