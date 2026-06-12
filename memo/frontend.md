# フロントエンド メモ

## 採用技術スタック

| 項目              | 採用                                               |
| ----------------- | -------------------------------------------------- |
| 言語              | TypeScript                                         |
| ビルド/開発サーバ | Vite                                               |
| UI                | React                                              |
| データ取得        | fetch + 自作クライアント(後に TanStack Query 予定) |
| UIライブラリ      | shadcn/ui(Phase 5 で導入予定)                      |
| ルーティング      | React Router(Phase 5 で導入予定)                   |

create-react-app は Meta が事実上メンテ終了 → Vite が現代の主流。

---

## プロジェクト初期化

```bash
pnpm create vite apps/web --template react-ts
```

- `--template react-ts` で対話なしで TS + React テンプレ
- 既存ディレクトリがあると失敗するので、空でないなら `rm -rf` で消してから

### package.json の name

- pnpm workspace で識別される名前
- `"name": "web"` に統一(ルートの `pnpm dev:web` で参照)

### 起動

- ルートから: `pnpm dev:web`
- 個別から: `pnpm --filter web dev`
- URL: `http://localhost:5173`

---

## CORS (Cross-Origin Resource Sharing)

### CORS とは

- 異なるオリジン間のリクエストを制限する**ブラウザのセキュリティ機構**
- オリジン = `protocol + host + port`
- ポートが違うだけで別オリジン扱い(localhost:5173 vs localhost:3000)

### なぜブロックされる

- 銀行サイトログイン中に悪意あるサイトを開く → API 経由で金抜き、を防ぐ
- ブラウザはデフォルトで異オリジンを制限
- サーバー側で「ここから許可」を明示すれば通る

### curl は CORS 関係ない

- CORS は**ブラウザ専用**のチェック
- curl やサーバー間通信では発動しない

### Hono での CORS 設定

```ts
import { cors } from 'hono/cors';

app.use(
  '/*',
  cors({
    origin: 'http://localhost:5173'
  })
);
```

- Hono 内蔵なので追加 install 不要
- `'/*'` で全パスに適用
- `origin` は単一 / 配列 / `'*'` / 関数 で指定可能
- 本番デプロイ時は本番フロント URL に変える

### `app.use(path, middleware)` とは

- ミドルウェア = 各リクエスト処理の前後に挟む共通処理
- CORS 以外にも、ロギング、認証チェックなどで使う

---

## 環境変数 (Vite)

### ファイル配置

- `apps/web/.env` — 開発用、`.gitignore` で除外
- `apps/web/.env.example` — Git にコミット

### Vite のルール

- **`VITE_` プレフィックス必須** — それ以外はクライアントに公開されない
- セキュリティ機構: うっかり秘密キーをブラウザに露出させない
- 例: `VITE_API_URL=http://localhost:3000`

### 利用

```ts
const url = import.meta.env.VITE_API_URL;
```

- `import.meta.env` で読み込み
- ビルド時に値が置換される(ランタイム変数ではない)

---

## API クライアントの設計方針

### 一箇所にまとめる理由

1. **URL 一元管理** — 本番デプロイで全箇所書き換えを避ける
2. **エラー処理の統一**
3. **型推論を効かせる**

### ファイル構成

```
apps/web/src/api/
├── types.ts      # レスポンス型定義
└── client.ts     # fetch ラッパー + 各エンドポイント
```

### fetch ラッパーの基本形

```ts
async function apiFetch<T>(path: string): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}
```

- ジェネリック `<T>` で戻り値型を呼び出し側で指定
- `res.ok` で 4xx/5xx をキャッチして例外化

### クエリ文字列の組み立て

```ts
const query = new URLSearchParams();
if (params?.limit !== undefined) query.set('limit', String(params.limit));
const path = `/api/v1/choujin${query.toString() ? `?${query}` : ''}`;
```

- `URLSearchParams` を使う(エスケープが自動で安全)
- 手で `?limit=${...}` と書くより堅牢

---

## 型定義 (type vs interface)

### 結論

- **現代の TS では `type` が主流**(React/Hono/Drizzle 全部 `type`)
- 「API だから interface」は古い情報、TS の interface に「契約」のニュアンスは無い
- どちらを選ぶにせよ、**プロジェクト内で統一**が一番大事

### 共通でできること

- オブジェクト型の定義
- プロパティ値が Union(`string | null` など)← **interface でも書ける**
- ジェネリック
- 継承(extends / 交差)

### `type` だけができること

1. プリミティブのエイリアス: `type ID = string`
2. **型エイリアスそのものが Union**: `type Status = 'a' | 'b'`
3. **型同士の Union**: `type Res = Success | Error`
4. タプル: `type Point = [number, number]`
5. Mapped Types / 条件型
6. `typeof` を使った型抽出: `type Choujin = typeof choujin.$inferSelect`

### `interface` だけができること

- **Declaration Merging**(同名宣言の自動マージ)
- 主にライブラリ拡張で使う(React や Express の型を拡張する場面)

### I プレフィックス

- `IChoujinDetail` のように `I` を付けるのは古い慣習(C# 由来)
- TypeScript 公式が「使うな」と明言
- 現代 TS / React / Hono / Drizzle どれも付けない

### ジェネリック型でレスポンス共通化

```ts
type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

// 使うとき
type ChoujinListResponse = PaginatedResponse<ChoujinListItem>;
```

---

## 命名規則: API レイヤと TS レイヤ

- **API は snake_case**(`real_name`, `height_cm`)
- **TS は camelCase**(`realName`, `heightCm`)
- API レイヤを境界として、両側で命名が違ってよい
- 型定義は API の形に合わせる(snake_case で記述)

---

## ハマりポイント

### CORS エラー

- ブラウザの fetch で発生、curl では出ない
- エラー全文に `Access-Control-Allow-Origin` が含まれていれば CORS
- 対処: サーバー側に `cors()` ミドルウェア追加

### `import.meta.env` の値が undefined

- 環境変数名に `VITE_` プレフィックスがついてるか確認
- `.env` ファイルがフロント側 (`apps/web/`) にあるか確認
- 変更後は Vite 再起動が必要なことがある

### `pnpm create vite` でディレクトリエラー

- 既存ディレクトリが空でないと失敗 → `rm -rf` で消して再実行

---

## 動作確認用の最小コンポーネント (App.tsx)

```tsx
const [data, setData] = useState<PaginatedResponse<ChoujinListItem> | null>(null)

useEffect(() => {
  fetchChoujinList().then(setData).catch(...)
}, [])

if (!data) return <div>Loading...</div>
return <ul>{data.results.map(c => <li key={c.slug}>{c.name}</li>)}</ul>
```

- `useEffect` + `useState` でデータ取得の最小パターン
- ローディング/エラー状態の手書きが必要 → ボイラープレートが多い
- → 次フェーズで TanStack Query 導入して圧縮予定

---

## Tailwind CSS

### v4 のセットアップ (Vite)

```bash
pnpm add -D tailwindcss @tailwindcss/vite
```

`vite.config.ts`:

```ts
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  plugins: [react(), tailwindcss()]
});
```

`src/index.css`:

```css
@import 'tailwindcss';
```

### v3 との違い

- v3: `tailwind.config.js` + PostCSS 設定が必要
- v4: Vite プラグインだけで OK、設定ファイル不要
- インポートは `@import "tailwindcss"` 1行

---

## shadcn/ui

### 思想

- 「UI ライブラリ」ではなく「Radix + Tailwind のコピペ集」
- コンポーネントをプロジェクトにコピーする方式
- 中身を読める / 変更できる / 依存に縛られない

### 構造

shadcn/ui = Radix UI (挙動・アクセシビリティ) + Tailwind (見た目)

- Radix = ヘッドレス UI ライブラリ(キーボード操作、スクリーンリーダー対応など)
- shadcn = その上に Tailwind で見た目を載せた完成品

### セットアップ

```bash
pnpm dlx shadcn@latest init
```

- Component library: Radix
- Preset: Nova(無難)
- CSS variables: Yes

### コンポーネント追加

```bash
pnpm dlx shadcn@latest add button
```

→ `src/components/ui/button.tsx` が生成される(自分のコード扱い)

### `variant` プロパティ

- `default` / `outline` / `ghost` / `destructive` / `link`
- `cva()`(class-variance-authority) で variant ごとの class が定義されている

### パスエイリアス `@/`

- `vite.config.ts` の `resolve.alias` で `@` を `./src` に
- `tsconfig.json` と `tsconfig.app.json` の両方に `paths` を書く
- shadcn が `@/components/ui/...` 形式で import を生成する

### Tailwind v4 でよく使うクラス

- 余白: `p-6`, `mb-4`, `space-y-2`, `gap-4`
- レイアウト: `flex flex-col`, `max-w-3xl mx-auto`, `flex-1`
- 色: `text-muted-foreground`, `bg-accent`, `bg-background`
  - shadcn の CSS 変数なのでテーマ変更で一括変更可能
- ホバー: `hover:bg-accent`, `hover:underline`
- 位置: `sticky top-0`, `z-10`

---

## React Router

### 採用理由

- TanStack Router も型安全で良いが、情報量で React Router 圧勝
- 学習プロジェクトは情報量重視

### インストール

```bash
pnpm add react-router-dom
```

### 基本構造

```tsx
<BrowserRouter>
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/about" element={<About />} />
  </Routes>
</BrowserRouter>
```

- `<BrowserRouter>` — URL を監視、History API で SPA 遷移
- `<Routes>` — 中のルートから1つだけマッチして描画
- `<Route path element>` — パスとコンポーネントの対応

### `<Link>` vs `<a>`

- `<Link to="/about">` — **SPA 内ナビ、再読み込みなし**(状態保持)
- `<a href="/about">` — ページ全体リロード(SPA では NG)
- SPA 内のリンクは必ず `<Link>` を使う

### `<NavLink>` で active 判定

```tsx
<NavLink
  to="/docs"
  end
  className={({ isActive }) =>
    isActive ? 'active-class' : 'normal-class'
  }
>
```

- 現在ページのリンクを強調表示できる
- `end` を付けると完全一致時のみ active
  - 付けないと `/` が全ページで active 扱いになる(全URLが `/` で始まるため)

### ネストルートと `<Outlet />`

レイアウト共通化のパターン:

```tsx
<Route element={<Layout />}>
  <Route path="/" element={<Home />} />
  <Route path="/about" element={<About />} />
</Route>
```

`Layout` 内で:

```tsx
<Header />
<Outlet />   {/* ← ここに子ページが入る */}
<Footer />
```

- 親レイアウト(Header/Footer)はページ遷移しても変わらない
- `<Outlet />` の中身だけが切り替わる
- これが SPA の典型的な構造

### 直接アクセス

- `http://localhost:5173/about` を URL バーに直打ち → SPA でも対応可能
- BrowserRouter が history を見て初回描画してくれる

---

## レイアウト設計

### Sticky Footer パターン

```tsx
<div className="min-h-screen flex flex-col">
  <Header />
  <main className="flex-1">
    <Outlet />
  </main>
  <Footer />
</div>
```

- 中身が短くてもフッターが画面下部に張り付く
- `flex-1` で main が残りスペースを全部使う

### Sticky ヘッダー

```tsx
<header className="sticky top-0 bg-background z-10">
```

- スクロールしても画面上部に追従
- `bg-background` を忘れると透けて見にくい
- `z-10` で重なり順を上に

---

## 外部リンクの基本マナー

```tsx
<a
  href="https://example.com"
  target="_blank"
  rel="noopener noreferrer"
>
```

- `target="_blank"` — 新規タブ
- `rel="noopener noreferrer"` — セキュリティ対策
  - `noopener`: 新タブから元タブを操作されない
  - `noreferrer`: リファラ送らない
- 外部リンクには必ずセット

---

## デザイン作り込みの順序

```
Phase 5 骨格(レイアウト・ルーティング)
Phase 6 中身(データ表示、機能実装)
Phase 7 デザイン仕上げ(色・フォント・余白・アニメーション)
```

- 機能が固まる前にデザインしても作り直しになる
- 「読める・触れる」レベルで一旦進めて、最後に整える
- shadcn は CSS 変数ベースなので、後からテーマ変更が容易

### Phase 7 で参考にしたいサイト

- PokéAPI — シンプル、参考にしやすい
- Stripe API Docs — プロ仕様、左サイドバー型
- Vercel Docs — モダン、スペーシングが綺麗
- Hono Docs — 簡潔
- shadcn/ui 公式 — ショーケース

---

## ハマりポイント

### shadcn init で「No import alias found」

- `tsconfig.json` と `tsconfig.app.json` の両方に `paths` を書く必要あり
- `vite.config.ts` の `resolve.alias` も必要

### Tailwind 入れた直後はスタイルが消える

- 既存 CSS がリセットされるため
- shadcn 入れて class を使い始めれば整う

### `<Link>` を忘れて `<a>` にすると全リロード

- React Query キャッシュも消える
- 一見動くが、SPA の旨味を失う

### NavLink で `/` が常に active

- `end` プロパティを付けて完全一致にする

---

## React Router 応用パターン

### 入れ子レイアウト(Outlet の二重化)

複数階層のレイアウトを綺麗に書ける:

---

## React Router 応用パターン

### 入れ子レイアウト(Outlet の二重化)

複数階層のレイアウトを綺麗に書ける:

```tsx
<Route element={<Layout />}>
  // 外側: Header/Footer
  <Route path="/" element={<Home />} />
  <Route path="/docs" element={<DocsLayout />}>
    // 内側: Sidebar
    <Route path="choujin" element={<ChoujinDocs />} />
    <Route path="faction" element={<FactionDocs />} />
  </Route>
</Route>
```

- `Layout` の `<Outlet />` に `DocsLayout` が入る
- `DocsLayout` の `<Outlet />` に `ChoujinDocs` / `FactionDocs` が入る
- 三層構造でも、各レイヤーは「自分の Outlet」だけ気にすればいい

### index ルートと Navigate でデフォルトリダイレクト

```tsx
<Route path="/docs" element={<DocsLayout />}>
  <Route index element={<Navigate to="/docs/choujin" replace />} />
  <Route path="choujin" element={<ChoujinDocs />} />
</Route>
```

- `index` = 親パスと完全一致したとき(`/docs`)に表示するルート
- `<Navigate to="..." replace />` でリダイレクト
- `replace` を付けると履歴を置き換える(戻るボタンで `/docs` に戻れない)
- 「`/docs` に来たら自動で `/docs/choujin` を表示」のような実装に使う

---

## URL に状態を乗せる原則

サイドバーの選択状態を `useState` で持つ vs URL で持つ:

| 方式     | 共有 | ブックマーク | 戻る/進む | リロード保持 |
| -------- | :--: | :----------: | :-------: | :----------: |
| useState |  ❌  |      ❌      |    ❌     |      ❌      |
| URL      |  ✅  |      ✅      |    ✅     |      ✅      |

→ **可能な限り URL に状態を乗せる**のが Web アプリの基本原則
→ サイドバーの選択、フィルタ条件、ページ番号 etc. は URL に出す

---

## NavLink の `end` プロパティ

### 動作

- `end={true}` — URL が**完全一致**したときだけ active
- `end={false}` — URL が**前方一致**したときも active(デフォルト)

### `/` だけ特殊な扱いが必要

| リンク                     | end   |        `/docs/choujin` を開いたとき active?         |
| -------------------------- | ----- | :-------------------------------------------------: |
| `<NavLink to="/" end>`     | true  |         ❌(完全一致しない) → これが期待動作         |
| `<NavLink to="/" />`       | false |    ✅(前方一致) → 全ページで active になっちゃう    |
| `<NavLink to="/docs" />`   | false |               ✅(前方一致) → 期待動作               |
| `<NavLink to="/docs" end>` | true  | ❌(完全一致しない) → サブページで active にならない |

### Home だけ end、他は前方一致

```tsx
function NavItem({ to, children }) {
  return (
    <NavLink to={to} end={to === '/'}>
      {children}

  )
}
```

#### `end={to === '/'}` の読み方

1. `to === '/'` は比較式 → **true / false を返す**
2. JSX の `{}` は **式の値を prop に渡す**
3. 結果: Home (`/`) だけ `end={true}`、他は `end={false}`

冗長に書くと:

```tsx
end={to === '/' ? true : false}  // 三項演算子(冗長)
end={Boolean(to === '/')}         // 明示的(不要)
end={to === '/'}                  // ベスト
```

- 比較演算子は最初から boolean を返す → ラップ不要

---

## Flexbox の罠と対策

### `min-w-0` で「子要素はみ出し問題」を回避

- Flex アイテムはデフォルトで `min-width: auto`
- 中身が長いコンテンツ(長文、コードブロック、長い URL など)を入れると、**親を押し広げる**
- `min-w-0` で「縮んでも良い」を明示

特に長い JSON をコードブロックで表示するページでよく踏む。

### `shrink-0` で「縮ませない」を明示

- Flex は中身の余白が足りないと、各アイテムを縮めようとする
- サイドバーのような「固定幅」要素には `shrink-0` を付ける

---

## Sticky 要素を重ねるときの注意

- Sticky ヘッダー(`top-0`)とサイドバー(`top-20`)を併用するとき
- サイドバーの `top` をヘッダー高さ分ずらさないと、ヘッダーの裏に潜り込む
- ヘッダーには `z-10` で重なり順を上に

---

## ドキュメントページの構築

### 共通コンポーネント化の方針

複数の API エンドポイントを表示するページでは、繰り返しを減らすため共通部品を作る:

- `<CodeBlock>` — JSON 表示 + コピー機能
- `<EndpointCard>` — エンドポイント1つ分(URL・説明・パラメータ・サンプル)

これで Choujin、Faction、将来の technique など、リソースが増えても同じパターンで書き足せる。

---

## CodeBlock の実装ポイント

### Clipboard API

```ts
await navigator.clipboard.writeText(code);
```

- ブラウザ標準のクリップボード API
- **HTTPS または localhost でのみ動作**(セキュリティ仕様)
- async 関数

### 「Copied!」を一時表示するパターン

```tsx
setCopied(true);
setTimeout(() => setCopied(false), 2000);
```

- クリックで `true`、2秒後に元に戻す
- よくある UX パターン(GitHub の Code コピーなど)

### group + group-hover で「親ホバー時に子の表示」

```tsx
<div className="group">
  <Button className="opacity-0 group-hover:opacity-100" />
</div>
```

- 親に `group`、子に `group-hover:...` を付ける
- Tailwind の重要パターン
- 「コピーボタンは普段隠れていて、ホバー時に出現」のような UX

### スクロール対応

- 長い JSON でも画面を圧迫しない
- `max-h-96` = 24rem (384px)

### JSON 整形

```ts
JSON.stringify(data, null, 2);
```

- 第2引数 null = デフォルト
- 第3引数 2 = インデント幅2スペース
- 読みやすい整形 JSON になる

---

## EndpointCard の実装ポイント

### Method バッジで HTTP メソッドを強調

- 緑色のラベル
- 将来 POST/DELETE を追加するときは色を変えると見やすい
  - GET=緑、POST=青、PUT=黄、DELETE=赤 が定番

### unknown 型でレスポンスを受ける

```ts
sampleResponse: unknown;
```

- `any` ではなく `unknown` を使うのが安全
- `unknown` は操作する前に型ガードが必要 → うっかり処理を防ぐ
- `JSON.stringify` に渡すだけなら `unknown` で問題なし

### Loading / Error 状態を統一表示

```tsx
{isLoading && Loading...}
{error && Error: {error}}
{!isLoading && !error && }
```

- TanStack Query の `isLoading` / `error` をそのまま prop で受ける
- 各 EndpointCard で同じ表示パターンを保証

---

## Path Parameter と Query Parameter を分ける

REST API には2種類のパラメータがある:

| 種類            | 例                                | URL 内の場所 |
| --------------- | --------------------------------- | ------------ |
| Path Parameter  | `/api/v1/choujin/:slug` の `slug` | パスの一部   |
| Query Parameter | `?faction=seigi` の `faction`     | `?` 以降     |

### EndpointCard で分離

```tsx
<EndpointCard
  pathParams={[...]}    // セクション1
  queryParams={[...]}   // セクション2
/>
```

### 利点

- ドキュメントとして正確
- ユーザーが「URL のどこに入れるか」を一目で理解
- ParamTable コンポーネントは共通化(DRY)

### 内部実装の DRY

```tsx
function ParamTable({ title, params }) {
  // ...
}
// EndpointCard 内で 2回使う
```

- 同じテーブルを Path/Query で繰り返さない
- 同ファイル内の private 関数として置けばOK(複数ファイルで使うなら export)

---

## TanStack Query で複数クエリを並列実行

```tsx
const listQuery = useQuery({
  queryKey: ['choujin', 'list'],
  queryFn: () => fetchChoujinList()
});

const detailQuery = useQuery({
  queryKey: ['choujin', 'detail', 'kinnikuman'],
  queryFn: () => fetchChoujinDetail('kinnikuman')
});
```

- 1コンポーネント内で複数 useQuery を呼べる
- それぞれ独立してローディング/エラー状態を持つ
- 並列で fetch が走る(順次ではない)
- queryKey が違うので別キャッシュとして扱われる

### Query Key の階層化が活きる場面

- `['choujin', 'list']`
- `['choujin', 'detail', 'kinnikuman']`

Devtools で見ると、`choujin` 配下に階層的に表示される。将来:

- `['choujin', 'list', { faction: 'seigi' }]` を増やしても整理されたまま

---

## オプショナルチェイニング `?.` と nullish 合体 `??`

エラーメッセージを安全に取り出すパターン:

```tsx
error={listQuery.error?.message ?? null}
```

- `error?.message` — `error` が null/undefined ならスキップ(エラーにならない)
- `?? null` — 左が null/undefined なら右(null)を返す

普通の `||` との違い:

```ts
0 || 'fallback'; // → 'fallback'(0 が falsy なので)
0 ?? 'fallback'; // → 0(null/undefined ではないので)
```

- `??` は **null と undefined だけ**を fallback の条件にする
- 数値の 0 や空文字 '' を許容したいケースで `||` の代わりに使う

## DRY と Single Responsibility のバランス

### 過度な共通化は避ける

- `EndpointCard` の中で `ParamTable` を分離 → ✅ 自然な分割
- 1ヶ所でしか使わないものを切り出しても無意味
- 「**2回以上同じパターンが出てきたら共通化を検討**」が経験則(Rule of Three)

### 関数コンポーネントの境界

- 同ファイル内の private 関数 → 共通化したいけど他ファイルでは使わない
- 別ファイルに切り出し + export → 複数ファイルで使う、または十分な独立性がある

今回の `ParamTable` は前者。複数の `EndpointCard` で使われるが、`EndpointCard` の外には出さない。
