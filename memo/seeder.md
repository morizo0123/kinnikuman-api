# シーダー (Seeder) メモ

## シーダーとは

- 初期データを DB に投入するスクリプト
- 用途: 開発初期の最低限データ、DB 作り直し時の復元、テスト環境の再現
- PokéAPI も裏で巨大なシーダーが動いている

---

## 設計方針

### データとロジックを分離

- `seed/data.ts` — データ本体(編集しやすく)
- `seed/seed.ts` — 投入ロジック

### TS でデータを書く理由 (JSON ではなく)

- 型補完が効く
- typo 検知できる
- `as const` で読み取り専用 + リテラル型保持
- import で他から参照しやすい

### slug ベースで関係を書く

- データ側: `factionSlugs: ['seigi', 'idol']` と人間が読める形
- 投入時: slug → id を Map で解決して中間テーブルに INSERT
- 「**人間が書きやすい形で書く、DB に入れる時に変換**」が肝

---

## 冪等性 (idempotency)

- **何度実行しても同じ結果になる**ようにする
- シーダーの最初に既存データを全削除する

```ts
await db.delete(choujinFaction); // 子(中間)から先に
await db.delete(choujin);
await db.delete(faction);
```

- 削除順は **子 → 親**(外部キー制約違反を避ける)
- 挿入順は **親 → 子**

⚠️ 本番 DB で叩いたら全データ消える → 環境変数チェック必須(後で実装)

---

## 実装パターン

### `.returning()` で auto-increment された id を取得

```ts
const [inserted] = await db
  .insert(choujin)
  .values(choujinData)
  .returning({ id: choujin.id });
```

SQL の `INSERT ... RETURNING id` と同じ。中間テーブルに繋ぐ id がすぐ手に入る。

### slug → id の Map で参照解決

```ts
const factionRows = await db.select().from(faction);
const factionIdBySlug = new Map(factionRows.map((row) => [row.slug, row.id]));
// 後で factionIdBySlug.get('seigi') で id 取得
```

### rest 構文でデータを分割

```ts
const { factionSlugs, ...choujinData } = c;
await db.insert(choujin).values(choujinData); // 本体テーブル用
// factionSlugs は中間テーブル用に別途使う
```

本体テーブルに入れる部分と、リレーション用の部分を1行で分割できる。

---

## id の挙動 (SQLite AUTOINCREMENT)

- 一度使った id は再利用されない
- `DELETE` してもメタデータが残るので、次の INSERT は続きの id から
- 例: 1, 2 を消した後に INSERT すると id は 3 から始まる
- これは PostgreSQL のシーケンス、MySQL の AUTO_INCREMENT も同じ仕様
- 理由: 削除後の id 再利用で過去のログ・参照が別データを指すのを防ぐ

### 対処方針

- API は **slug** で参照する設計 → id がいくつでも外部から見えない
- 開発中は気にしない、id は内部実装の都合と割り切る
- どうしてもリセットしたい場合は `DROP TABLE` → `db:push`

---

## package.json への追加

```json
"db:seed": "tsx src/seed/seed.ts"
```

---

## ハマりポイント

- **削除順を間違えると外部キーエラー**: 中間 → 親 の順を守る
- **拡張子 `.js` の import**: TS でも `from '../db/index.js'` と書く(ESM 仕様)
- **`as const` した配列を Drizzle に渡すとき**: `[...arr]` でミュータブル配列にコピーする必要あり

---

## 開発フロー (シーダーありの場合)

1. `schema.ts` 編集
2. `pnpm db:push` で DB 反映
3. `pnpm db:seed` でデータ投入
4. `pnpm db:studio` で目視確認
5. `pnpm dev` で API 起動
