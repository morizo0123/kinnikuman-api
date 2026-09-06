# TanStack Query メモ

## 何のためのライブラリか

- **サーバーステート(API から取ってきたデータ)を管理する**ライブラリ
- 旧称: React Query
- `useState + useEffect + fetch` の組み合わせを置き換える

了解です！TanStack Query は今後も使い続ける重要な道具なので、専用ファイルにまとめましょう。
memo/tanstack-query.md を提案します。frontend.md に混ぜると埋もれるので、独立させた方が後で参照しやすいです。

markdown# TanStack Query メモ

## 何のためのライブラリか

- **サーバーステート(API から取ってきたデータ)を管理する**ライブラリ
- 旧称: React Query
- `useState + useEffect + fetch` の組み合わせを置き換える

## 何が嬉しいか

| 課題                   | 自前                     | TanStack Query     |
| ---------------------- | ------------------------ | ------------------ |
| ローディング状態       | `useState` で管理        | `isLoading` 自動   |
| エラー状態             | `try/catch` + `useState` | `error` 自動       |
| キャッシュ             | 手動                     | 自動               |
| 重複リクエスト排除     | 自前でフラグ管理         | 自動               |
| 同じデータの共有       | props バケツリレー       | 同じキーで自動共有 |
| 再フォーカス時の再取得 | 自前                     | 自動(設定可)       |
| 再試行                 | 自前                     | 自動               |

## 似たライブラリ

- **TanStack Query**: デファクト、汎用、フレームワーク非依存
- SWR: Vercel 製、シンプル、軽量
- RTK Query: Redux 使ってるなら
- Apollo Client: GraphQL 専用

REST API なら TanStack Query が情報量・機能とも豊富。

---

## セットアップ

### インストール

```bash
pnpm add @tanstack/react-query
pnpm add -D @tanstack/react-query-devtools
```

### QueryClient のセットアップ (main.tsx)

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      refetchOnWindowFocus: false
    }
  }
});
```

- アプリ全体を `QueryClientProvider` で囲む(Context API ベース)
- QueryClient はアプリ全体で1つ
- Devtools は開発時のみ表示、画面右下の花アイコン

### デフォルト設定の意味

- `staleTime: 60 * 1000` — 取得後60秒は「新鮮」扱い、再取得しない(デフォルトは 0)
- `refetchOnWindowFocus: false` — タブ復帰時の自動再取得を OFF

---

## useQuery の基本

```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['choujin', 'list'],
  queryFn: () => fetchChoujinList()
});
```

### 必須プロパティ

- **queryKey**: このクエリの一意の識別子。配列で書く
- **queryFn**: データを取ってくる関数。Promise を返せば何でも OK

### 戻り値の主なもの

- `data` — 取得したデータ(成功時)
- `isLoading` — 初回ロード中
- `isFetching` — 任意の再取得中(キャッシュ表示中も含む)
- `error` — エラーオブジェクト
- `refetch()` — 手動再取得

---

## queryKey の設計

### 1つのクエリしかない時はどう書いても動く

```
['choujin']            // OK
['choujin', 'list']    // OK
```

動作的な差はない。`useQuery` は深い比較でキャッシュを引く。

### クエリが増えると階層化が効いてくる

**フラット(NG 寄り)**:

```
['choujin']                     // 一覧
['choujin', 'seigi']            // 絞り込み? 詳細?
['choujin', 'kinnikuman']       // 詳細
```

→ パッと見て区別できない、キャッシュ操作で意図しないものが巻き込まれる

**階層化(推奨)**:

```
['choujin', 'list']                          // 一覧
['choujin', 'list', { faction: 'seigi' }]    // 絞り込み
['choujin', 'detail', 'kinnikuman']          // 詳細
```

### 3層構造(公式推奨パターン)

| 層    | 例                    | 意味       |
| ----- | --------------------- | ---------- |
| 1層目 | `'choujin'`           | リソース名 |
| 2層目 | `'list'` / `'detail'` | 操作の種類 |
| 3層目 | パラメータ            | 個別の識別 |

### 階層化の恩恵: 部分マッチでキャッシュ操作

```ts
// list 系を全部再取得
queryClient.invalidateQueries({ queryKey: ['choujin', 'list'] });

// choujin 関連を全部
queryClient.invalidateQueries({ queryKey: ['choujin'] });
```

- 階層化してあれば「部分一致」でまとめて操作できる
- フラットだとこれが効かない

---

## Query Key Factory パターン(将来)

queryKey を定数として一箇所に集める:

```ts
export const choujinKeys = {
  all: ['choujin'] as const,
  lists: () => [...choujinKeys.all, 'list'] as const,
  list: (params?: { faction?: string }) =>
    [...choujinKeys.lists(), params] as const,
  details: () => [...choujinKeys.all, 'detail'] as const,
  detail: (slug: string) => [...choujinKeys.details(), slug] as const
};

useQuery({
  queryKey: choujinKeys.list({ faction: 'seigi' }),
  queryFn: () => fetchChoujinList({ faction: 'seigi' })
});
```

メリット:

- 定義が一箇所
- typo 防止
- 型補完が効く
- リファクタが楽

クエリが増えてきたタイミングで導入を検討。

---

## React Query Devtools

- 画面右下の花アイコンから開く
- 今キャッシュされてる全クエリの一覧、状態、データ
- 強制再取得ボタン
- デバッグの神ツール
- `initialIsOpen={false}` で初期非表示

### 状態の色分け

- 緑(fresh): 新鮮
- 黄(stale): 古い扱い、次に使われた時に再取得
- 灰(inactive): 今は使われていない
- 青(fetching): 取得中

---

## キャッシュの体感

開発者ツールの Network タブで:

1. 初回表示 → リクエストが飛ぶ
2. 同じデータが再表示 → 飛ばない(キャッシュから)
3. `staleTime` 経過後 → 次に使われた時に再取得

「同じ画面に何度遷移しても fetch が走らない」がキャッシュの恩恵。

---

## ハマりポイント

### queryKey の typo / 表記揺れ

- `['choujin', 'list']` と `['Choujin', 'list']` は別物扱い
- 大文字小文字で意図せず別キャッシュになる
- → Query Key Factory で防げる

### `staleTime: 0`(デフォルト)で頻繁に fetch

- デフォルトは即 stale 扱い
- マウントのたびに再取得が走る
- 開発体験的にちょっと長めにすると快適(数十秒〜数分)

### StrictMode で2回 fetch が走る?

- React 19 の StrictMode は開発時に effect を2回実行する
- TanStack Query は重複排除するので本番の動作には影響なし
- 気になるなら Devtools で確認

---

## Try it 機能パターン(ボタン式実行)

### やりたいこと

- API ドキュメントで、ユーザーがパラメータを画面から変えて実行
- Stripe、Twilio などの Docs で見る「Try it out」機能
- **ボタン押下時だけ**API を叩く(初回自動実行しない)

### enabled オプション

```ts
useQuery({
  queryKey: [...],
  queryFn: () => fetch(...),
  enabled: false,  // ← 自動実行しない
})
```

- デフォルトは `true`(マウント時自動実行)
- `false` にすると条件を満たすまで待機
- 値ベースで制御することが多い(`enabled: someParam !== null`)

### 「Null Object Pattern」で実行状態を管理

```ts
const [committed, setCommitted] = useState<Params | null>(null);

const query = useQuery({
  queryKey: ['tryit', committed],
  queryFn: () => fetch(committed!),
  enabled: committed !== null // null なら発動しない
});

function handleExecute(values) {
  setCommitted(convertToParams(values)); // ボタン押下でセット → useQuery 発動
}
```

- **初期状態 `null`**: まだ実行してない意味
- ボタン押下 → state を更新 → 依存配列(queryKey)が変わって useQuery 発動
- 「実行済み or 未実行」を明示的に区別できる

### queryKey にオブジェクトを含める

```ts
queryKey: ['choujin', 'tryit', 'list', params];
```

- オブジェクトそのものを queryKey に含めてOK
- TanStack Query は**深い比較**でキーを判定
- `{limit: 20}` と `{limit: 30}` は別キー扱い → 別キャッシュ

### 同じ値で2回目実行 → キャッシュから返る

- 同じ params でボタンを押しても、キャッシュがあれば再フェッチしない
- Network タブに新規リクエストが出ない
- Devtools で確認できる

---

## isLoading vs isFetching

| プロパティ   | true になるタイミング                           |
| ------------ | ----------------------------------------------- |
| `isLoading`  | **初回**の取得中(まだキャッシュがない)          |
| `isFetching` | 任意の取得中(キャッシュありでも再取得中は true) |

### 使い分け

- 「初回表示」用のスケルトン: `isLoading`
- 「実行中」フィードバック(Try it の再クリックなど): `isFetching`

Try it out ボタンは同じ値でも「実行してる感」を出したいので `isFetching` を使う。

---

## Sample と Try it で別クエリキャッシュ

```ts
// Sample Response 用
useQuery({ queryKey: ['choujin', 'list'], ... })

// Try it out 用
useQuery({
  queryKey: ['choujin', 'tryit', 'list', params],
  enabled: params !== null,
})
```

- **別キー = 別キャッシュ**
- Try it で faction=seigi を叩いても、上の Sample Response には影響なし
- 階層化した queryKey がここで活きる

---

## 動的フォーム状態管理

### Record<string, string> で汎用フォーム

```ts
const [values, setValues] = useState<Record>(() => {
  const initial: Record = {};
  for (const p of params) {
    initial[p.name] = p.defaultValue ?? '';
  }
  return initial;
});

function setValue(name: string, value: string) {
  setValues((prev) => ({ ...prev, [name]: value }));
}
```

- パラメータ定義(配列)から初期値を組み立て
- `[name]: value` は**計算プロパティ名**(変数の値をキーに)
- Immutable 更新: `{...prev, [name]: value}` で全コピー + 1つだけ上書き

### `useState(() => ...)` の関数形式

- 初期値の計算が重い場合、関数形式で「初回だけ実行」に
- パフォーマンス最適化

---

## UI 値と API パラメータの変換

境界層で変換するのが定石:

```ts
function handleExecute(values: Record) {
  setCommitted({
    limit: values.limit ? parseInt(values.limit, 10) : undefined,
    offset: values.offset ? parseInt(values.offset, 10) : undefined,
    faction: values.faction === 'all' ? undefined : values.faction
  });
}
```

### 変換パターン

- 空文字 → `undefined`(API に送らない)
- 文字列 → `parseInt(..., 10)` で数値化
- 「全て」を意味する特別値(`'all'`)→ `undefined`

「UI で扱う形」と「API で扱う形」を分けて考えるのがきれい。

---

## Radix UI Select の落とし穴

### 空文字を SelectItem の value にできない

```tsx
{
  /* ❌ エラー */
}
```

**エラーメッセージ**:

> A <Select.Item /> must have a value prop that is not an empty string.

### 理由

- Radix は「`value=""` = 未選択(placeholder 表示)」と定義
- 空文字は**内部で予約済み**
- SelectItem に `""` を渡すと未選択と区別できない

### 対処

- 「全て」を意味する値は `'all'` や `'__all__'` を使う
- API に送るときは変換ロジックで `undefined` に落とす

---

## 汎用 TryItSection コンポーネント設計

### パラメータ定義の型

```ts
export type TryItParam = {
  name: string;
  type: 'text' | 'number' | 'select';
  label: string;
  defaultValue?: string;
  options?: { value: string; label: string }[];
  placeholder?: string;
};
```

- 1つの型でテキスト、数値、ドロップダウンを表現
- エンドポイントごとの違いを配列で表現

### 関心の分離(Container / Presentation)

TryItSection (UI 専任)
├ フォーム状態
├ 実行ボタン
└ Response 表示
↓ props で通知
親コンポーネント (API 専任)
├ useQuery
└ onExecute で params を確定

- TryItSection は UI のみ、API 呼び出しは親に任せる
- 関心を分けると再利用性が上がる

---

## htmlFor と id でアクセシビリティ

```tsx
<Label htmlFor="limit">Limit</Label>
<Input id="limit" ... />
```

- ラベルクリックで対応 Input にフォーカスが移る
- スクリーンリーダーが「これが limit の入力欄」と読める
- shadcn の Label + Input を使う時は忘れずに紐付け

---

## Path Parameter の Try it

Query Parameter(limit, offset)と違い、Path Parameter は URL の一部として埋め込まれる:

- List: `/api/v1/choujin?limit=20&faction=seigi`
- Detail: `/api/v1/choujin/kinnikuman`

Try it の実装パターンは Query とほぼ同じ、変換ロジックが違うだけ。

### 例: slug の受け渡し

```ts
type DetailTryParams = {
  slug: string;
};

const [detailTryParams, setDetailTryParams] = useState<DetailTryParams | null>(
  null
);

const detailTryQuery = useQuery({
  queryKey: ['choujin', 'tryit', 'detail', detailTryParams],
  queryFn: () => fetchChoujinDetail(detailTryParams!.slug),
  enabled: detailTryParams !== null
});
```

### queryFn での nullable 対応

```ts
queryFn: () => fetchChoujinDetail(detailTryParams?.slug ?? '');
// または
queryFn: () => fetchChoujinDetail(detailTryParams!.slug);
```

- `!`(non-null assertion): TS に「これは null じゃない」と伝える
- 実行時は `enabled: ... !== null` で保護されているので安全
- 型を最初から nullable なしにすると `!` が1つで済む

### defaultValue に例を入れると親切

```ts
{ name: 'slug', type: 'text', label: 'Slug', defaultValue: 'kinnikuman' }
```

- 初期状態でボタンを押すだけで結果が出る
- ユーザーが「何を入れればいいか」を理解しやすい

---

## サーバー待ちの UX 改善

存在しない ID などで API を叩くと、404 が返るまで数百msかかる。
この間の見せ方で体感時間が変わる。

### 対処: スケルトン UI + スピナー

Response エリアにスケルトンを表示すると「動いてる感」が出る:

```tsx
{
  isLoading && (
    <div className="space-y-2">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
  );
}
```

ボタン内にスピナーを回す:

```tsx
{
  isLoading ? (
    <Loader2 className="h-4 w-4 animate-spin" />
  ) : (
    <Play className="h-4 w-4" />
  );
}
```

### animate-spin

Tailwind の組み込みアニメーション、360度回転を無限ループ:

```css
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.animate-spin {
  animation: spin 1s linear infinite;
}
```

### 表示ロジックの整理

```tsx
{
  (isLoading || result !== undefined || error) && (
    <div>
      <h4>Response</h4>
      {isLoading && <Skeleton />} {/* 実行中 */}
      {!isLoading && error && <ErrorBox />} {/* エラー */}
      {!isLoading && result !== undefined && !error && <Result />} {/* 成功 */}
    </div>
  );
}
```

- ローディング中は「スケルトンだけ」
- 完了後は「エラー or 結果」に切り替え
- 条件を `!isLoading &&` で守るのが定石

---

## 「体感時間」という概念

Web アプリの UX で覚えておくべき原則:

> 実際の時間は同じでも、見せ方で「体感時間」は変えられる

代表的なパターン:

1. **スケルトン UI** — データの形を予告
2. **Progressive Rendering** — 部分的にすぐ表示
3. **Optimistic Update** — 即座に成功したフリ
4. **Prefetching** — 先読みで待ちを消す
5. **スピナー・プログレス** — 進行中を明示

TanStack Query は全部サポートしてる。「実装は同じ、見せ方だけ変える」で UX が大きく向上する場面が多い。

---

## curl コマンドの動的表示

### なぜ表示するか

- 「実際に curl でどう叩くか」をドキュメント上で示せる
- ユーザーがコピペしてターミナルで実行できる
- Stripe / Twilio / Postman が標準でやっている機能

### 実装方針: 関数を props で渡す

TryItSection の中で「curl 文字列を組み立てる関数」を受け取る:

```tsx
type Props = {
  // ...
  buildCurl?: (values: Record<string, string>) => string;
};
```

親コンポーネントから、そのエンドポイント固有の組み立てロジックを渡す:

```tsx
buildCurl: (values) => {
  const query = new URLSearchParams();
  if (values.limit) query.set('limit', values.limit);
  if (values.faction && values.faction !== 'all') {
    query.set('faction', values.faction);
  }
  const q = query.toString();
  const path = `/api/v1/choujin${q ? `?${q}` : ''}`;
  return `curl http://localhost:3000${path}`;
};
```

### なぜ関数を渡す?

- エンドポイントごとに URL の組み立て方が違う
- 「Path Parameter を埋め込む」「Query String を組み立てる」「特別値の除外」がバラバラ
- 関数として渡せば、汎用コンポーネントを保ちつつ柔軟に対応

### 値変更で自動更新される仕組み

```tsx
<CodeBlock code={buildCurl(values)} />
```

- `values` は state → 変更されれば再レンダリング
- 再レンダリング時に `buildCurl(values)` が再実行 → 新しい文字列
- **React のリアクティブ機能だけで実現、useEffect 不要**

---

## 中継コンポーネントの型定義パターン

### 問題

`TryItSection` → `EndpointCard` → `ChoujinDocs` と props を中継する構造だと:

- TryItSection の Props に prop を追加
- **EndpointCard も型を追加しないとエラー**
- 手動での二重管理が必要

### 解決策1: 型を export して共有

```tsx
// TryItSection.tsx
export type TryItProps = {
  params: TryItParam[];
  onExecute: (values: Record<string, string>) => void;
  // ...
};

// EndpointCard.tsx
import type { TryItProps } from './TryItSection';
type Props = {
  tryIt?: TryItProps;
};
```

### 解決策2: ComponentProps ヘルパー(定石)

```tsx
import type { ComponentProps } from 'react';
import { TryItSection } from './TryItSection';

type Props = {
  tryIt?: ComponentProps<typeof TryItSection>;
};
```

- コンポーネントの Props 型を**直接**参照
- 追加・削除しても自動で追従、ズレることがない
- 中継コンポーネントの定石テクニック

### 解決策3: prop の平坦化

```tsx
// ネスト
tryIt={{ params, onExecute, ... }}

// 平坦化
tryItParams={params}
onTryItExecute={onExecute}
```

- 中継が楽
- ただし親コンポーネントの Props が肥大化

### 選び方

- 頻繁に変わるなら **解決策2**
- そもそも props が少ないなら **今の手動追加**でも OK
- チーム開発で厳密性が欲しければ **解決策2**

---

## URLSearchParams の使い方(再掲)

```typescript
const query = new URLSearchParams();
if (values.limit) query.set('limit', values.limit);
query.toString(); // → "limit=20&offset=0"

const path = `/api/v1/choujin${query.toString() ? `?${query}` : ''}`;
```

### ポイント

- **空値・undefined は set しない** → 綺麗な URL に
- クエリ文字列がなければ `?` 自体を付けない
- エスケープが自動なので安全

### 手書き文字列との比較

```typescript
// NG: エスケープが必要、条件分岐が煩雑
const path = `/api/v1/choujin?limit=${limit}&offset=${offset}`;

// OK: URLSearchParams
const query = new URLSearchParams({ limit, offset });
```

---

## 環境変数で URL を切り替える

開発中はローカル、本番は本番 URL に切り替えたい:

```typescript
`curl ${import.meta.env.VITE_API_URL}${path}`;
```

- Vite の `VITE_` プレフィックス環境変数
- `.env.development` / `.env.production` で切り替え可能
- 学習中は `localhost:3000` ハードコードで OK

---

## API クライアントを ApiResponse<T> でラップする

### 動機

- Try it 機能で HTTP ステータス、レスポンスタイムなど**メタ情報**を表示したい
- 従来の `fetch → JSON` だと status やタイムがどこにも残らない
- API クライアントを「JSON + メタ情報」を返す形にラップする

### 型設計

```ts
export type ApiResponse<T> = {
  data: T;
  status: number;
  statusText: string;
  durationMs: number;
};
```

### apiFetch の実装

```ts
async function apiFetch<T>(path: string): Promise<ApiResponse<T>> {
  const start = performance.now();
  const res = await fetch(`${BASE_URL}${path}`);
  const durationMs = Math.round(performance.now() - start);

  if (!res.ok) {
    const error = new Error(`API error: ${res.status} ${res.statusText}`);
    (error as any).status = res.status;
    (error as any).durationMs = durationMs;
    throw error;
  }

  const data = (await res.json()) as T;
  return { data, status: res.status, statusText: res.statusText, durationMs };
}
```

### エラー時のメタ情報

- `throw new Error(...)` した Error オブジェクトに status を仕込む
- `;(error as any).status = ...` は「型を無視して代入」
- TanStack Query の `error` を経由して呼び出し側で取り出せる
- 厳密にやるなら「ApiError クラス」を定義するが、シンプルさ優先で any

---

## performance.now() vs Date.now()

| API                 | 精度                     | 用途                                   |
| ------------------- | ------------------------ | -------------------------------------- |
| `Date.now()`        | ミリ秒(整数)             | 通常のタイムスタンプ                   |
| `performance.now()` | マイクロ秒(小数点以下も) | **短い時間差の計測**(API 応答時間など) |

### 使い方

```ts
const start = performance.now();
// ... 処理 ...
const durationMs = Math.round(performance.now() - start);
```

- `performance.now()` は「ページ読み込み時からの経過時間」を返す
- 差分を取ればその処理の実行時間
- 表示用に `Math.round()` で整数化することが多い

---

## TanStack Query の select オプション

### 用途

「queryFn の結果を**変換してから**呼び出し側に渡す」

### 使い方

```ts
useQuery({
  queryKey: [...],
  queryFn: () => fetchChoujinList(),        // ApiResponse<T> を返す
  select: (res) => res.data,                 // 呼び出し側にはこれだけ渡す
})
// listQuery.data は res.data 相当
```

### メリット

- 呼び出し側のコード変更なし(内部の型変更に強い)
- キャッシュ自体は生データを保持、変換は表示時に実行
- 他の useQuery で同じキャッシュを別の形で使うこともできる

### いつ select を使わない?

- Try it のように**生のメタ情報**(status, durationMs)が欲しい場合
- そのときは select を付けず、`.data.data` でアクセス

---

## 段階的リファクタリングの手順

内部設計を変えるとき、**動作を壊さず**進めるための定石:

Step 1: 基盤を変える(apiFetch を ApiResponse<T> に)
↓
Step 2: 呼び出し側で select を付ける(既存動作を維持)
↓
Step 3: 動作確認(何も変わらないことを確認)
↓
Step 4: 新機能を追加(バッジ、タイム表示)
↓
Step 5: 動作確認(新機能が動くことを確認)

### なぜこの順序か

- **「動くもの」を常にキープ**しながら進む
- 何か壊れたらどのステップで壊れたか特定しやすい
- ぶっつけ本番で全部書き換えると原因追跡が地獄

これは実務でも頻繁に使うテクニック。「Refactor first, then add feature」。

---

## HTTP ステータスの色分け慣習

Web の世界で広く使われる色分け:

| ステータス | 意味               | 色               |
| ---------- | ------------------ | ---------------- |
| 2xx        | 成功               | 緑(emerald)      |
| 3xx        | リダイレクト       | 青(あまり見ない) |
| 4xx        | クライアントエラー | 黄(amber)        |
| 5xx        | サーバーエラー     | 赤(red)          |

### Tailwind での実装

```tsx
const color =
  status >= 200 && status < 300
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
    : status >= 400 && status < 500
      ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300';
```

- ライト / ダーク両対応
- 標準の色分けに従うと、ユーザーが直感的に理解できる
- Postman、Swagger UI、ブラウザ Dev Tools など、みんなこの色分け

---

## Error オブジェクトに情報を付与するパターン

### 問題

`throw new Error('...')` だと、エラー時にメッセージしか渡らない。
status やタイムなど**追加情報**を残したい。

### 解決

```ts
const error = new Error(`API error: ${res.status}`);
(error as any).status = res.status;
(error as any).durationMs = durationMs;
throw error;
```

### 呼び出し側

```ts
tryIt={{
  status:
    listTryQuery.data?.status ??                    // 成功時
    (listTryQuery.error as any)?.status,            // エラー時
}}
```

- `??`(nullish 合体演算子)で「成功時 or エラー時」を1行で表現
- `(x as any)` はキャストが必要(Error 型に status プロパティがないため)

### より厳密にやるなら

```ts
class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public durationMs: number
  ) {
    super(message);
  }
}
```

カスタムエラークラスを定義すると型安全。実務ではこっちがおすすめ。

--

## 中継コンポーネントの Props 拡張

### 3層構造の課題

TryItSection → EndpointCard → ChoujinDocs
TryItSection の Props に追加したら、EndpointCard の型も追従が必要。

### 今回のアプローチ

手動で3箇所を更新:

1. TryItSection の Props 型に追加
2. EndpointCard の tryIt 型にも追加
3. TryItSection への受け渡しに追加

### 面倒に感じたら

`ComponentProps<typeof TryItSection>` で自動追従できる:

```tsx
type Props = {
  tryIt?: ComponentProps<typeof TryItSection>;
};
```

中継が多くなってきたら移行する候補。
