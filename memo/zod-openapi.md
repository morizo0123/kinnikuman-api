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

---

## Hono RPC (hc) で BE の型を FE に共有

### そもそもの発想

- Zod OpenAPI で作ったルート型を、FE から直接使えたら理想
- 手書きの API クライアント(fetchChoujinList など)を書かなくて済む
- BE の変更が FE のコンパイル時に検知される

### hc の仕組み(概念)

```ts
// BE 側
const app = new OpenAPIHono();
app.openapi(route, handler);
export type AppType = typeof app; // ← 型として export

// FE 側
import { hc } from 'hono/client';
import type { AppType } from 'api';
const client = hc<AppType>('http://localhost:3000');

// 使う側
const res = await client.api.v2.choujin.$get({
  query: { limit: '20', faction: 'seigi' }
});
```

### 何が起きているか

- `typeof app` で app に蓄積された全ルート情報を型化
- FE 側は `hc<AppType>(...)` でその型を丸ごと受け取る
- 実行時のコードは配信しない、**型情報だけを共有**
- BE の Zod スキーマを変えると FE の補完が自動追従

---

## モノレポ内での型共有セットアップ

### 前提: pnpm workspace

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

### 依存関係の追加

FE の package.json に BE を workspace dependency として追加:

```bash
cd apps/web
pnpm add hono
pnpm add 'api@workspace:*'   # zsh はクォート必須(*が展開される)
```

package.json に反映される:

```json
{
  "dependencies": {
    "api": "workspace:*",
    "hono": "..."
  }
}
```

### zsh の特殊文字問題

```bash
# NG: zsh の * がグロブ展開されて "no matches found"
pnpm add api@workspace:*

# OK: クォートで囲む
pnpm add 'api@workspace:*'

# OK: ^ でも同じ意味
pnpm add api@workspace:^

# OK: package.json を直接編集 → pnpm install
```

- bash は未マッチのグロブをそのまま渡す
- zsh は未マッチをエラーにする(デフォルト設定)
- 覚えておくと救われる

---

## exports フィールドで TS ソースを直接共有

### 問題

`import type { AppType } from 'api'` すると **"モジュールが見つからない"** エラー。

### 原因

`apps/api/package.json` に「エントリーポイントはどこ?」が書かれていない。
Node.js / TypeScript は `exports` フィールドを見て解決する。

### 修正

apps/api/package.json に追加:

```json
{
  "name": "api",
  "type": "module",
  "exports": {
    ".": "./src/index.ts"
  }
  // ...
}
```

### exports の記法

- `"."` はパッケージ本体(`import from 'api'`)
- `"./sub"` みたいにサブパスも定義可能
- 解決先を条件分岐(`import` / `require` / `types` など)することも可能

### 通常は .js を指定するが、モノレポでは .ts でも OK

- 一般的な npm パッケージ配布 → ビルド済み `.js` を指定
- **モノレポ内で TS ソースを直接共有** → `.ts` を指定できる
- FE 側の Vite / TS Server が TS をそのまま扱えるので問題なし
- 事前ビルドが不要になる利点

### TypeScript の型解決

- exports に `.ts` を指定 → 型もソースファイルから直接読める
- 別途 `types` フィールドも不要
- モノレポの型共有では鉄板パターン

---

## Hono RPC の型補完

### 補完が効くパスの例

```ts
client.api.v2.choujin.$get({
  query: { limit: '20' }
});

client.api.v2.choujin[':slug'].$get({
  param: { slug: 'kinnikuman' }
});

client.api.v2.faction.$get({
  query: { limit: '10' }
});
```

### 記法のポイント

- **パス**はドット記法(オブジェクトのプロパティのように)
- **パスパラメータ**は `[':slug']` のようにブラケット記法
- **HTTP メソッド**は `$get`, `$post` など `$` プレフィックス
- **クエリ/パス/ボディ**はオブジェクトで渡す

### 型がミスを検知

```ts
// OK
client.api.v2.choujin.$get({ query: { faction: 'seigi' } })

// TS エラー(faction_slug なんてキーは無い)
client.api.v2.choujin.$get({ query: { faction_slug: 'seigi' } })

// TS エラー(パスが違う)
client.api.v2.choujin.detail.$get(...)
```

### 実行時ではなくコンパイル時に検知

- ランタイムに到達する前に IDE で赤線
- BE を変更したら FE がすぐビルドエラーを出す
- **「BE と FE の同期が絶対にズレない」** 状態

---

## 手書き API クライアント vs hc の比較

|                 | 手書き       | Hono RPC (hc)      |
| --------------- | ------------ | ------------------ |
| fetch 関数      | 自分で書く   | 不要               |
| 型定義          | 手書き       | 自動               |
| URL 組み立て    | 文字列で書く | プロパティアクセス |
| BE 変更への追従 | 手で修正     | **自動**           |
| リクエスト型    | 手書き       | 自動               |
| レスポンス型    | 手書き       | 自動               |

### hc のトレードオフ

- **利点**: 型安全性、DRY、保守が楽
- **欠点**:
  - Hono 依存(他のフレームワークで再利用しにくい)
  - モノレポ前提(別リポの BE では openapi-typescript のほうが良い)
  - FE のバンドルに Hono が入る(小さいけどゼロではない)

### 併存戦略

- BE と FE が同じリポなら → hc
- BE と FE が別リポなら → openapi-typescript
- ドキュメント公開が主なら → Swagger UI

---

## 型共有の選択肢まとめ

Zod OpenAPI を導入した後、FE との型共有には 3 つの選択肢:

| 方法                   | 説明                          | 向いてる場面                    |
| ---------------------- | ----------------------------- | ------------------------------- |
| **Hono RPC (hc)**      | typeof app を FE から使う     | モノレポ、Hono を BE に採用     |
| **packages/shared**    | Zod スキーマを両方から import | 型/バリデーション両方共有したい |
| **openapi-typescript** | OpenAPI JSON から型生成       | 別リポ、公開 API のクライアント |

今回は**モノレポ + Hono** なので Hono RPC が最適。

---

## Step 9-6 の進捗記録

- [x] BE で `export type AppType = typeof app`
- [x] FE で `pnpm add hono` と `pnpm add 'api@workspace:*'`
- [x] apps/api/package.json に exports 追加
- [x] FE で `const client = hc<AppType>(...)` 動作、補完が効く状態
- [ ] 既存の fetch 関数を hc ベースに書き換え(次回)
- [ ] Try it の hc 移行(次回)

---

## チェーン記法の徹底: Hono RPC の型伝搬

### 問題の症状

`hc<AppType>(...)` の `client` が **unknown 型** になる。
`AppType` を確認すると `OpenAPIHono<Env, {}, "/">` みたいに中身が空。

### 原因

Hono の `.route()` や `.openapi()` は「元の型 + 追加ルートの型」を持つ**新しい型**を返す。
戻り値を捨てると、**元の変数の型は変わらない**(TS の仕様)。

```ts
// NG: 戻り値を捨てている
app.route('/api/v2/choujin', choujinV2Route);
app.route('/api/v2/faction', factionV2Route);
export type AppType = typeof app;
// → AppType には何も型情報が入らない
```

### 解決: チェーン + const で受ける

```ts
const routes = app
  .route('/api/v1/choujin', choujinRoute)
  .route('/api/v2/choujin', choujinV2Route)
  .route('/api/v2/faction', factionV2Route);

export type AppType = typeof routes; // ← app じゃなく routes
```

### サブルーターも同じ問題

`choujin-v2.ts` などのサブルーター内でも同じ:

```ts
// NG
app.openapi(route, handler);
app.openapi(detailRoute, detailHandler);
export default app; // → 型情報が積まれていない

// OK
const routes = app.openapi(route, handler).openapi(detailRoute, detailHandler);
export default routes;
```

### 3層構造の全ての層でチェーン必須

```
Layer 3: index.ts
const routes = app.route().route().route()
export type AppType = typeof routes

Layer 2: 各サブルーター (choujin-v2.ts など)
const routes = app.openapi().openapi()
export default routes

Layer 1: 各エンドポイント
Zod スキーマから自動(ここは既に OK)
```

**どこか1箇所で戻り値を捨てると、そこから下の型情報が全部消える**。

### 教訓

Hono RPC は「戻り値を受け取るチェーン」を徹底しないと機能しない。
これは Hono / tRPC 系フレームワーク独特の書き方で、慣れれば違和感なくなる。

---

## hc の呼び出し記法

### Query の場合

```ts
client.api.v2.choujin.$get({
  query: { limit: '20', faction: 'seigi' }
});
```

- パスは**ドット記法**で辿る
- HTTP メソッドは **`$get`, `$post`** など `$` プレフィックス
- クエリは `query` プロパティのオブジェクト
- 値は文字列(BE の `z.coerce.number()` が数値化)

### Path Parameter の場合

```ts
client.api.v2.choujin[':slug'].$get({
  param: { slug: 'kinnikuman' }
});
```

- パスパラメータ部分は **`[':slug']` のブラケット記法**
  - ドット記法だと `:` があるので構文エラー
- **`param` は単数形**(慣習)

### BE と FE の記法対応

| BE (createRoute)           | FE (hc)                         |
| -------------------------- | ------------------------------- |
| `path: '/'`                | `.` (ルート)                    |
| `path: '/{slug}'`          | `[':slug']`                     |
| `request: { query: ... }`  | `.$get({ query: ... })`         |
| `request: { params: ... }` | `.$get({ param: ... })` (単数!) |

### 慣習の癖

- BE の request は `params`(複数形)、valid の引数と hc の引数は `param`(単数形)
- BE のパス指定は `{slug}` 中括弧、FE の呼び出しは `[':slug']` コロン付き
- 歴史的経緯なので、パターンとして覚えるしかない

---

## hc ベースの fetch 関数例

### Query パラメータのパターン

```ts
export async function fetchChoujinList(params?: {
  limit?: number;
  offset?: number;
  faction?: string;
}): Promise<ApiResponse<PaginatedResponse<ChoujinListItem>>> {
  const start = performance.now();

  // undefined を渡さないため、Record で組み立て
  const query: Record<string, string> = {};
  if (params?.limit !== undefined) query.limit = String(params.limit);
  if (params?.offset !== undefined) query.offset = String(params.offset);
  if (params?.faction) query.faction = params.faction;

  const res = await client.api.v2.choujin.$get({ query });

  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).durationMs = durationMs;
    throw error;
  }

  const data = await res.json();
  return {
    data: data as PaginatedResponse<ChoujinListItem>,
    status: res.status,
    statusText: res.statusText,
    durationMs
  };
}
```

### Path Parameter のパターン

```ts
export async function fetchChoujinDetail(
  slug: string
): Promise<ApiResponse<ChoujinDetail>> {
  const start = performance.now();

  const res = await client.api.v2.choujin[':slug'].$get({
    param: { slug }
  });

  const durationMs = Math.round(performance.now() - start);
  // ... (以降 List と同じ)
}
```

### 大事なポイント

- `apiFetch` は使わない(hc が内部で fetch する)
- performance.now() での計測、status 保持は自前で
- レスポンス型は `as` で既存型にキャスト(hc の型推論と既存型が微妙にズレるため)

---

## hc の落とし穴: undefined 直渡し

```ts
// NG: 型エラーになる可能性
client.api.v2.choujin.$get({
  query: { limit: undefined }
});
```

Zod スキーマで `.optional()` にしていても、呼び出し側で `undefined` を明示するとエラー扱いになることがある。

### 対処: Record<string, string> で組み立て

```ts
const query: Record<string, string> = {};
if (params?.limit !== undefined) query.limit = String(params.limit);
```

「値がある時だけキーをセット」。**キー自体を無くす**のがコツ。

---

## v1 と v2 の hc での違い

hc が型を提供するのは **Zod OpenAPI で定義されたルートだけ**。
v1 の普通の `app.get(...)` は型が薄い(`BlankSchema` 扱い)。

```ts
// v2: 型補完がっつり
client.api.v2.choujin.$get({ query: {...} })

// v1: 型は薄い(hc の恩恵少ない)
client.api.v1.choujin.$get(...)
```

→ hc の恩恵を受けたいなら、v2(Zod OpenAPI 版)を叩くのが正解。

---

## ポート衝突と Vite 設定

### 複数プロジェクトで Vite の 5173 が被る問題

```ts
// apps/web/vite.config.ts
export default defineConfig({
  plugins: [...],
  server: {
    port: 5273,        // ← 好きな番号
    strictPort: true,  // ← 使用中ならエラーで起動失敗
  },
  // ...
})
```

### strictPort の意味

- **無効(デフォルト)**: 使用中なら次の番号を試す(5174, 5175...)
- **有効**: 使用中ならエラー → 意図せず違うポートで起動するのを防ぐ

CORS 設定と絡む場面では **strictPort: true を強く推奨**。
「動くけど CORS で謎に弾かれる」という混乱を避けられる。

### BE の CORS も追従

```ts
// apps/api/src/index.ts
app.use(
  '/*',
  cors({
    origin: 'http://localhost:5273' // ← FE の新ポートに追従
  })
);
```

複数許可も可能:

```ts
origin: ['http://localhost:5273', 'http://localhost:5173'];
```

### 開発環境設定の教訓

- 最初にポート・パスを固めておく
- チーム開発なら README に明記
- ポートは覚えやすい語呂で(5273 = キン肉的な)

---

## Step 9-6 の全体進捗

- [x] BE で `export type AppType = typeof routes`(チェーン重要)
- [x] FE で `pnpm add hono` と `pnpm add 'api@workspace:*'`
- [x] apps/api/package.json に `exports` 追加
- [x] FE で `const client = hc<AppType>(...)` で補完が効く
- [x] fetchChoujinList を hc ベースに書き換え
- [x] fetchChoujinDetail を hc ベースに(Path Param パターン)
- [x] fetchFactionList, fetchFactionDetail も同様に
- [x] ポート整理と CORS 設定

--

## Step 9-6 の達成した状態

```
BE (apps/api)
Zod スキーマ書く
↓
createRoute + app.openapi()
↓
const routes = app.route().route()... (チェーン重要!)
↓
export type AppType = typeof routes
↓
apps/api/package.json の exports 経由で共有
↓
FE (apps/web)
import type { AppType } from 'api'
↓
const client = hc<AppType>(url)
↓
client.api.v2.choujin.$get({...}) ← 型補完バッチリ
```

- ✅ BE の Zod スキーマから FE の型付きクライアントが自動生成
- ✅ 手書きの型定義ゼロ
- ✅ BE を変えれば FE の補完が自動追従
- ✅ **フルスタック TypeScript の真骨頂**を体感

---

## Phase 9 全体の教訓

### スキーマ駆動 + 型共有の全体像

1. **Zod スキーマ** = ソースオブトゥルース(1つの真実)
2. **バリデーション**、**型**、**OpenAPI ドキュメント**が自動導出
3. **Hono RPC** で FE まで型が届く
4. すべての層で「同じ情報が別の形」

### なぜ現代の主流か

- 型と実装のズレが起きない(仕様書と実装が同じ)
- BE の変更が FE のビルドエラーで検知される
- ドキュメント作成のコストがゼロ
- リファクタリングが安全

### tRPC / Nuxt / Remix なども同じ思想

- 「BE と FE の型を統合する」流れは、今の Web 開発の最先端の1つ
- TypeScript の力を最大限に活かした設計
- Phase 9 で体感したことは、これらの他フレームワークでも活きる
