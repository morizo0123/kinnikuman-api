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
