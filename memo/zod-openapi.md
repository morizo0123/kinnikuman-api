# Zod + @hono/zod-openapi メモ

## そもそもの狙い

**1つのスキーマから3つが自動生成される**:

Zod スキーマを1回書く
├→ TypeScript の型(z.infer で自動)
├→ ランタイムバリデーション(不正な値を弾く)
└→ OpenAPI スキーマ → Swagger UI で対話的な仕様書

これが**スキーマ駆動開発 (Schema-Driven Development)** の核心。
1つのソースオブトゥルースから全てが派生 → DRY(Don't Repeat Yourself)。

---

## Zod の基本

### TypeScript の型宣言との違い

- TS の `type` はコンパイル時のみ、実行時に消える
- Zod のスキーマは**実行時に動く** → 外部データの検証ができる

### 基本形

```ts
import { z } from 'zod';

const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

// 検証
const data = UserSchema.parse(input); // 型と実際の値が一致しなければ throw

// 型の自動導出
type User = z.infer<typeof UserSchema>;
// → { name: string; age: number }
```

### よく使うバリデーター

```ts
z.string(); // 文字列
z.number().int().min(1).max(100); // 1-100 の整数
z.string().email(); // メールアドレス形式
z.string().url(); // URL 形式
z.array(z.string()); // 文字列の配列
z.enum(['a', 'b', 'c']); // 特定の値のみ
z.string().optional(); // undefined 可
z.string().nullable(); // null 可
z.number().default(20); // 未指定時のデフォルト
```

### z.coerce.number()

```ts
z.number(); // '20' → エラー(型が違う)
z.coerce.number(); // '20' → 20 に変換してから検証
```

クエリパラメータは常に文字列で届くので、数値受け取りには `coerce` が必須。

---

## インストール

```bash
pnpm add @hono/zod-openapi @hono/swagger-ui
```

- `zod` 自体は `@hono/zod-openapi` の依存に含まれる → 明示的な install 不要
- `@hono/swagger-ui` は次のステップで使う

---

## OpenAPIHono と createRoute

### OpenAPIHono

- `Hono` の拡張版。OpenAPI ルートを扱える
- 基本的な使い方は Hono と同じ

### createRoute で「仕様と実装を分離」

```ts
const route = createRoute({
  method: 'get',
  path: '/',
  tags: ['Choujin'],
  summary: '超人一覧を取得',
  request: {
    query: QuerySchema
  },
  responses: {
    200: {
      content: {
        'application/json': { schema: ListResponseSchema }
      },
      description: '超人一覧'
    }
  }
});

app.openapi(route, async (c) => {
  // 実装
});
```

### 分離のメリット

- 仕様がドキュメントとして参照できる
- 型がハンドラで自動で効く
- OpenAPI スキーマも自動生成される

---

## c.req.valid の使い方

### バリデーション済みの型付き値を取得

```ts
const { limit, offset } = c.req.valid('query');
// limit: number (Zod で number().int() だから)
// offset: number
```

### 従来との比較

```ts
// 従来の Hono
c.req.query('limit'); // string(自分で parseInt が必要)

// Zod + OpenAPIHono
c.req.valid('query').limit; // number(バリデーション済み + 型付き)
```

- `valid('query')` は request.query に定義された Zod スキーマに従う
- `valid('json')`、`valid('param')` などもある

---

## スキーマ命名の慣習

```ts
const QuerySchema = z.object({...})        // クエリ用
const ListResponseSchema = z.object({...})  // レスポンス用
const ChoujinItemSchema = z.object({...})   // 個別アイテム用
```

- 末尾に **Schema** を付ける
- 用途がわかる名前(Query, Request, Response, Item など)
- 大文字始まり(型と同じ命名感覚)

---

## v1 と v2 の並行運用パターン

### やり方

```ts
app.route('/api/v1/choujin', choujinV1Route); // 既存
app.route('/api/v2/choujin', choujinV2Route); // Zod 版
```

- 両方のパスを同時にサポート
- 既存機能を壊さずに新方式を試せる
- 動作確認しながら段階的に移行できる

### 移行完了後

- v1 を削除
- v2 → v1 に rename、または v2 のまま公開

---

## 既存ロジックの流用

- Zod は「入力の検証」と「出力の型定義」を担当
- **DB 操作(Drizzle)は今まで通り**
- ハンドラ内のロジック(JOIN、count 計算など)は v1 とほぼ同じ

つまり:

- 変わるのは**入出力の境界層**だけ
- 内部ロジックは資産として残る

---

## 分割代入でのリネーム

```ts
const { limit, offset, faction: factionSlug } = c.req.valid('query');
```

- `faction: factionSlug` で「取り出して別名にする」
- Drizzle の `faction` テーブルと変数名がぶつかるときに使う

---

## Zod のバリデーションエラー

デフォルトでは以下の形で返る:

```json
{
  "success": false,
  "error": { "issues": [...] }
}
```

必要に応じてカスタマイズできる(Step 9-4 以降で対応するなら)。

---

## ハマりポイント

### `c.req.valid('query')` で型エラー

- `createRoute` の `request.query` にスキーマを渡さないと `valid('query')` が使えない
- 型は Zod スキーマから自動導出されるので、スキーマ定義が正確でないと effects が出ない

### `z.number()` でクエリ受け取り不可

- クエリは常に string → `z.coerce.number()` が必須

### `.optional()` vs `.nullable()`

- `.optional()` → undefined 可、キーが無くても OK
- `.nullable()` → null 可、キーは必要だが値は null
- 用途が違うので使い分ける
- クエリパラメータは基本 `.optional()`
- レスポンスの null 可カラムは `.nullable()`

---

## 学び: 段階的移行の設計

新機能を導入するときの定石:

1. **並行運用**(v1 と v2 で共存)
2. **1エンドポイントずつ書き換え**
3. **動作確認しながら**
4. 全部移行終わったら v1 を撤去

今回もこの流れで進めている。ぶっつけ本番の全置換は事故のもと。
