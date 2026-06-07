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
