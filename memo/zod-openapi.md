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

---

## Zod の「実行時に動く」を深掘り

### 大前提: TypeScript は実行時に消える

```ts
// TS で書いたコード
type User = { name: string; age: number };

function greet(user: User) {
  console.log(`Hello, ${user.name}!`);
}
```

これが JS にコンパイルされると:

```js
function greet(user) {
  // 型情報が全部消える
  console.log(`Hello, ${user.name}!`);
}
```

TS の型チェックは**書いてるときにエディタで赤線を引く**だけ。実行時にはチェックしない。

### 何が困るか

**外部から来るデータは「本当にその型か」わからない**:

- API のリクエストパラメータ
- API のレスポンス
- フォーム入力
- localStorage / cookie
- JSON.parse したデータ
- 環境変数

```ts
const user = (await res.json()) as User;
// as User で「これは User だよ」と TS に嘘をついてる状態
// 実際に age が文字列や undefined でも TS は気づかない
```

### Zod は実行時に本当にチェック

```ts
const UserSchema = z.object({
  name: z.string(),
  age: z.number()
});

const user = UserSchema.parse(raw);
// この行で実行時に検証、違ってたら throw
```

Zod のコードは JS に変換されても**関数として残る**。`.parse()` は普通の関数呼び出し。だから実行時にチェックできる。

### 使い所の原則

- 自分のコード内 → TS の型で十分
- **外部との境界** → Zod で守る

「信用できないデータの入り口」で使うのが正解。

---

## TS 型 vs Zod スキーマの対比

|                    | TypeScript 型    | Zod スキーマ                   |
| ------------------ | ---------------- | ------------------------------ |
| いつ動く           | コンパイル時のみ | **コンパイル時 + 実行時**      |
| コード変換後       | 消える           | 残る(関数として)               |
| 外部データを検証   | ❌               | ✅                             |
| 型情報を持つ       | ✅               | ✅(z.infer で取り出せる)       |
| デフォルト値・変換 | ❌               | ✅                             |
| エラー時の詳細     | ❌               | ✅(どのフィールドがなぜダメか) |

### Zod は 1 つで 3 役

```ts
const UserSchema = z.object({...})

type User = z.infer<typeof UserSchema>  // 型
UserSchema.parse(data)                   // 検証
UserSchema.parse('...')                  // 変換(coerce も含む)
```

「型を書く」と「検証を書く」を **1回で済ませられる** のが DRY 的に美しい。

---

## Zod を使わないと地獄

Zod なし:

```ts
const limitStr = c.req.query('limit') ?? '20';
const limit = parseInt(limitStr, 10);
if (isNaN(limit)) return c.json({ error: '...' }, 400);
if (limit < 1 || limit > 100) return c.json({ error: '...' }, 400);
// 全パラメータ、全エンドポイントで繰り返し...
```

Zod あり:

```ts
const { limit } = c.req.valid('query');
// もう保証されている
```

境界層で1回定義するだけで、ハンドラは**保証されたデータ**で仕事できる。

---

## Zod OpenAPI: Path Parameter の書き方

### 混乱ポイント: パス記法が Hono と違う

- Hono: `/:slug`(コロン)
- Zod OpenAPI: `/{slug}`(中括弧)
- 内部的には Hono の `:slug` に変換される
- **createRoute では中括弧記法を使う**

### valid() の引数は単数形

```ts
c.req.valid('param'); // 正解(単数形)
c.req.valid('params'); // ❌ 動かない
```

request の記法は `params`(複数形)、取り出すのは `param`(単数形)。混乱ポイント。

### 対応表

| 用途             | request のキー | valid の引数 |
| ---------------- | -------------- | ------------ |
| クエリ           | `query`        | `'query'`    |
| パスパラメータ   | `params`       | `'param'`    |
| リクエストボディ | `body`         | `'json'`     |

--

## Zod OpenAPI の型推論の落とし穴

### 症状

`app.openapi()` のハンドラで `async (c) => {...}` に型エラーが出る:

型 '...' の引数を型 'Handler<...>' のパラメーターに割り当てることはできません

### 原因

`responses` に **複数のステータスコード**(200 + 404)を宣言してるとき、
`c.json(...)` の第2引数を省略すると TS が「どの status?」と推論に困る。

### 解決策

**成功時の c.json にも明示的にステータスコード(200)を書く**:

```ts
// エラー時: 404 を明示(これは元々書いてる)
if (!row) {
  return c.json({ error: 'Not found' }, 404);
}

// 成功時: 200 を明示(これを追加!)
return c.json(
  {
    slug: row.slug,
    name: row.name
    // ...
  },
  200 // ← これで型エラーが消える
);
```

### 教訓

> **responses に複数ステータスを宣言したら、c.json の第2引数を必ず明示**

これは Zod OpenAPI のあるあるバグ。覚えておくと救われる。

---

## .nullable() を忘れやすい

DB から null が返る可能性のあるカラム(realName、power、description など)は
Zod スキーマで `.nullable()` を付けないと、**レスポンスバリデーションでエラー**になる。

```ts
const ChoujinDetailSchema = z.object({
  slug: z.string(),
  name: z.string(),
  real_name: z.string().nullable(),    // ← null 可
  power: z.string().nullable(),
  origin: z.string().nullable(),
  height_cm: z.number().nullable(),
  weight_kg: z.number().nullable(),
  description: z.string().nullable(),
  factions: z.array(...),
})
```

### .nullable() と .optional() の違い(再掲)

- `.nullable()` → **null は許す**、undefined は許さない
- `.optional()` → **undefined は許す**、null は許さない
- 用途が違うので使い分ける

DB の nullable カラム → `.nullable()`
クエリの optional パラメータ → `.optional()`

---

## Path パラメータ用スキーマは使い回せる

```ts
const SlugParamSchema = z.object({
  slug: z.string()
});
```

- Choujin Detail、Faction Detail、両方で共通に使える
- スキーマも DRY にできる

ただし、共通スキーマにするか、各ファイルで独立させるかは判断次第:

- 意味が同じで変わらない → 共通
- 意味が違う(超人の slug と軍団の slug は概念別) → 独立

今回は各ファイル独立で書いてる(責務が明確)。

---

## Swagger UI の統合

### 必要なもの

```ts
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';
```

### app 自体を OpenAPIHono にする(重要)

```ts
// Before(サブルートだけ OpenAPIHono)
const app = new Hono();

// After(トップレベルも OpenAPIHono)
const app = new OpenAPIHono();
```

- `OpenAPIHono` は `Hono` の上位互換
- 既存の `app.get('/', ...)` など全てそのまま動く
- **トップレベルが OpenAPIHono でないと、全体のスキーマを収集できない**

### OpenAPI JSON と Swagger UI の 2 つを追加

```ts
// 1. OpenAPI JSON 仕様書
app.doc('/doc/openapi.json', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'KinnikumanAPI',
    description: 'キン肉マンに登場するキャラクター情報の REST API'
  }
});

// 2. Swagger UI
app.get('/doc', swaggerUI({ url: '/doc/openapi.json' }));
```

### app.doc() の仕組み

- アプリ全体の Zod スキーマと createRoute 情報を**自動収集**
- OpenAPI 3.0 標準フォーマットに変換
- 指定パスで JSON として配信
- **これが Zod OpenAPI の真骨頂**、1行で仕様書が生成される

### swaggerUI() の仕組み

- Swagger UI 本体は CDN から配信
- 内部で OpenAPI JSON を fetch して描画
- リクエストの試行、レスポンス確認まで全部やってくれる

### 慣習的なパス

- `/doc`、`/docs`、`/swagger` あたりが定番
- あなたのプロジェクトのフロント URL と被らないよう注意

---

## 説明を充実させる: .describe() と .openapi()

### フィールドに説明を付ける

```ts
const QuerySchema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe('1ページあたりの取得件数(1〜100)') // ← Zod 標準
    .openapi({ example: 20 }), // ← OpenAPI 用
  faction: z
    .string()
    .optional()
    .describe('軍団 slug で絞り込み(例: seigi)')
    .openapi({ example: 'seigi' })
});
```

### .describe() の効果

- Zod 標準のメソッド
- Swagger UI で **パラメータの description** として表示
- コード上のドキュメンテーションにもなる

### .openapi({ example: ... }) の効果

- `@hono/zod-openapi` が追加するメソッド
- OpenAPI 仕様の「example」に相当
- Swagger UI で **Try it out の初期値** にも入る
- 触りやすさが激変する

### チェーンの順序

```ts
z.string()
  .optional()          // ← Zod のバリデーション系
  .describe('...')     // ← 説明(表示用)
  .openapi({...})      // ← OpenAPI メタ情報
```

バリデーション系を先、表示系を後、が読みやすい。

---

## createRoute の description

`summary`(短い)と `description`(長い)の使い分け:

```ts
const route = createRoute({
  summary: '超人一覧を取得', // 一覧で表示される短い名前
  // 展開時に表示される詳細
  description:
    '登録されている全ての超人を、ページネーション付きで取得します。' +
    '`faction` クエリを指定すると、特定の軍団に所属する超人のみに絞り込めます。'
  // ...
});
```

### description は Markdown が使える

```ts
description: `
- \`limit\` で1ページあたりの件数を指定
- \`offset\` でスキップ数を指定
- \`faction\` で軍団絞り込み
`,
```

- コードブロック、リンク、リスト、全部使える
- **仕様書として読ませたい部分に投資する価値あり**

---

## レスポンスにも description

```ts
responses: {
  200: {
    content: {
      'application/json': { schema: ChoujinDetailSchema },
    },
    description: '超人詳細を返す',   // ← ここ
  },
  404: {
    content: {
      'application/json': { schema: ErrorSchema },
    },
    description: '指定された slug の超人が存在しない場合',
  },
},
```

- 各ステータスコードごとに「何を意味するか」を書く
- Swagger UI で綺麗に表示される
- 「404 はどんな時?」がひと目で分かる

---

## 手書きドキュメント vs Swagger UI の比較

Phase 6-8 で手作りしたドキュメント vs Swagger UI:

|                        | 手作り(Phase 6-8)        | Swagger UI(Phase 9)             |
| ---------------------- | ------------------------ | ------------------------------- |
| デザインのカスタマイズ | 自由                     | 制限あり                        |
| 実装                   | 自分で全部書く           | Zod スキーマから自動生成        |
| 保守                   | 実装と仕様がズレる可能性 | **必ず同期**(1つのソース)       |
| 対話性                 | 自分で Try it 実装       | 標準で付いてくる                |
| 標準化                 | 自分ルール               | OpenAPI 3.0 標準                |
| ツール連携             | 個別対応                 | Postman、Stoplight など多数対応 |

### どっちを使う?

- **一般公開のドキュメント**(ブランディング重要)→ 手作り
- **開発者向けの仕様書**(正確さ重要)→ Swagger UI
- **併存**が現実的な選択(実務でよくある)

今回のプロジェクトは両方あるので、目的で使い分け:

- `/docs/*` → 手作り(見せる)
- `/doc` → Swagger UI(開発者向け)

---

## スキーマ駆動開発の全体像

1つの Zod スキーマから得られるもの:

Zod スキーマを1回書く
├→ TypeScript の型(z.infer で自動)
├→ ランタイムバリデーション(自動)
├→ OpenAPI 仕様書(app.doc で自動)
├→ Swagger UI(swaggerUI で自動)
└→ (発展)クライアント SDK 生成(openapi-typescript 等)

### 実務での価値

- コードと仕様が **絶対にズレない**
- ドキュメント作成が「実装したら自動で完成」
- クライアント側の型定義も導出できる
- 型安全性が仕様レベルで担保される

これが「なぜスキーマ駆動が主流か」の答え。

---

## Phase 9 で学んだキーコンセプト

### Zod

- スキーマから型・バリデーション・変換を1つにまとめる
- 「実行時に動く」→ 外部データの検証ができる
- TypeScript の型と補完的な関係

### Zod OpenAPI

- `createRoute` で「仕様と実装を分離」
- `c.req.valid('query')` で型付きデータ取得
- `.describe()` `.openapi()` でメタ情報を追加

### Swagger UI

- 1つのスキーマから対話的な仕様書が自動生成
- 開発者向けの標準ツール
- 手作りドキュメントと併存できる

---

## Phase 9 全体の教訓

**「1回書いたら全部が同期する仕組み」を作ると、後の保守がラクになる**

- 手書きだと3箇所(型・バリデーション・ドキュメント)を維持
- スキーマ駆動だと1箇所を維持
- **DRY 原則の実践例**として、Zod スキーマ駆動開発は理想的
