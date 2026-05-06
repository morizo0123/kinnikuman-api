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

---

## 多対多の対称性

同じリレーションは**両方向から辿れる**:

choujin ⇔ choujin_faction ⇔ faction

- `GET /api/v1/choujin/:slug` → 超人から所属軍団を辿る
- `GET /api/v1/faction/:slug` → 軍団から所属超人を辿る

実装も**ほぼ鏡写し**になる:

```ts
// 超人詳細
db.query.choujin.findFirst({
  where: eq(choujin.slug, slug),
  with: { factions: { with: { faction: true } } }
});

// 軍団詳細(プロパティ名と参照先テーブルが入れ替わるだけ)
db.query.faction.findFirst({
  where: eq(faction.slug, slug),
  with: { choujins: { with: { choujin: true } } }
});
```

`schema.ts` の `relations()` で両側に `many()` を書いているおかげで、双方向が辿れる。

---

## ルーター追加の流れ (新リソース)

新しいリソース(例: faction)を追加するとき:

1. `src/routes/<resource>.ts` を作成
2. 一覧と詳細のハンドラを書く
3. `src/index.ts` で `app.route('/api/v1/<resource>', router)` でマウント

→ 既存リソースに影響なく、**ファイルを足すだけで API が広がる**

---

## レスポンス命名の慣習

- 配列名は **複数形** が JS/JSON の慣習(`choujins`, `factions`)
- 日本語ベースの単語(choujin)でも、配列なら複数形で揃えるとフロント側で扱いやすい
- PokéAPI では `forms`(複数形)と `pokemon_species`(複数形にしない)が混在 → **プロジェクト内で統一されていれば何でもOK**

---

## 動作確認パターン (各エンドポイントで実施)

```bash
# 一覧
curl -s http://localhost:3000/api/v1/<resource> | jq .

# 詳細
curl -s http://localhost:3000/api/v1/<resource>/<slug> | jq .

# 404 確認
curl -i http://localhost:3000/api/v1/<resource>/nonexistent
```

新エンドポイントを作ったら、必ず**成功・404 の両方**を確認する習慣を。

---

## ページネーション

### 方式

- **オフセット型**: `?limit=20&offset=40`
  - シンプルで理解しやすい
  - PokéAPI もこの方式
- カーソル型: `?cursor=xxx&limit=20`
  - 高速、無限スクロール向き
  - 今回は採用しない

### レスポンス形式 (PokéAPI 準拠)

```json
{
  "count": 1302,
  "next": "/api/v1/choujin?limit=20&offset=40",
  "previous": null,
  "results": [...]
}
```

| フィールド | 意味                          |
| ---------- | ----------------------------- |
| `count`    | 全件数(フィルタ後の総数)      |
| `next`     | 次ページの URL(最後なら null) |
| `previous` | 前ページの URL(最初なら null) |
| `results`  | 現在のページのデータ配列      |

---

## limit と offset の意味

- **limit** = 1ページに何件返すか
- **offset** = 先頭から何件**スキップする**か
  - 0-indexed なので、`offset=0` は先頭から、`offset=1` は2件目から
  - 「何番目から」と「何件スキップ」は1つズレるので注意

### ページ番号との変換

ページN の offset = limit × (N - 1)
例: limit=20、5ページ目 → offset = 80(81~100件目)

---

## 前後のページの計算

ページ1 ──[+limit]──→ ページ2 ──[+limit]──→ ページ3
offset=0 offset=10 offset=20
←──[-limit]── ←──[-limit]──

- 次のページ: `offset + limit`
- 前のページ: `offset - limit`
- マイナスを避けるため: `Math.max(offset - limit, 0)`
  - 例: `limit=20, offset=5` → 5 - 20 = -15 → 0 で止める

---

## 実装パターン

### 共通ユーティリティ (`lib/pagination.ts`)

- `parsePaginationParams(c)` — Hono Context からクエリ取得 + バリデーション
- `buildPaginatedResponse({...})` — レスポンス組み立て

### ハンドラ側

```ts
const { limit, offset } = parsePaginationParams(c);

// 全件数(別クエリで取得)
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(choujin);

// ページ分のデータ
const rows = await db.select().from(choujin).limit(limit).offset(offset);

return c.json(
  buildPaginatedResponse({ baseUrl, count, limit, offset, results })
);
```

### count(\*) は別クエリ

- データ取得: `SELECT * FROM ... LIMIT 20 OFFSET 40`
- 件数取得: `SELECT COUNT(*) FROM ...`
- 両方を組み合わせて「全 N 件中、X〜Y 件目」と返す

### Drizzle 流の count 取得

```ts
const [{ count }] = await db
  .select({ count: sql<number>`count(*)` })
  .from(table);
```

- `sql<number>` は Drizzle のテンプレートリテラル SQL
- 結果は `[{ count: 2 }]` の形なので分割代入で取り出す

---

## バリデーション (最小実装)

| 項目                | 対応                                 |
| ------------------- | ------------------------------------ |
| limit のデフォルト  | 20                                   |
| limit の上限        | 100(`?limit=99999` で DB 死亡を防ぐ) |
| limit の下限        | 1                                    |
| offset のデフォルト | 0                                    |
| offset の下限       | 0(マイナス禁止)                      |
| 文字列が来た場合    | NaN ガードして fallback              |

将来は Zod に置き換える予定 (`@hono/zod-validator`)。

---

## ハマったポイント

### 1. `c.req.url` がサブルーター内で期待と違う形になる

- 当初 `new URL(c.req.url)` で URL を作ってクエリを取得
- サブルーター内では `c.req.url` がマウント後のパスになることがある
- → **Hono の `c.req.query('xxx')` を使うのが正解**(フレームワーク提供のヘルパー優先)

### 2. previous が常に null になるバグ

- 原因: 不等号の向きを逆に書いていた

```ts
  // ❌ 間違い
  const previous = offset < 0 ? ... : null
  // ✅ 正しい
  const previous = offset > 0 ? ... : null
```

- `offset` は parse 時点で 0 以上に補正されるので、`offset < 0` は永遠に false → null
- **教訓**:
  - 動かないとき、まず**条件式**を疑う(不等号、否定、論理演算子)
  - 具体的なクエリ(`?limit=1&offset=1`)で叩くとバグが浮き彫りになる
  - `console.log` で実態を見る、推測しない

### 3. `Math.max(offset - limit, 0)` の意味

- `offset - limit` が**マイナスになるケース**を 0 で止める安全装置
- 例: `limit=20, offset=5` → `5 - 20 = -15` → 0 にする
- offset がマイナスは DB 的に意味不明なので、必ず非負にする

---

## 動作確認パターン

```bash
# デフォルト
curl -s http://localhost:3000/api/v1/choujin | jq .

# limit を変えて next を出す
curl -s "http://localhost:3000/api/v1/choujin?limit=1" | jq .

# offset を変えて previous を出す
curl -s "http://localhost:3000/api/v1/choujin?limit=1&offset=1" | jq .

# 異常系(落ちないか)
curl -s "http://localhost:3000/api/v1/choujin?limit=99999"  # 100に制限
curl -s "http://localhost:3000/api/v1/choujin?limit=abc"    # default(20)
curl -s "http://localhost:3000/api/v1/choujin?offset=-5"    # 0扱い
```

---

## デバッグの教訓 (memo)

- **「動いてるはず」を疑う**: 仕様通り書いたつもりでも、フレームワーク挙動で予想とズレる
- **テストケースを増やすと、バグが浮き彫りになる**
- **デバッグログは推測を排除する最強のツール**: `console.log` で実態を見る
- **不等号の向き、否定、論理演算子は最初に疑う場所**
