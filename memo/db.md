# DB 設計メモ

## 大原則

- **「実体」と「関係」を分けて考える**
  - 実体 = 超人、軍団、試合 → それぞれ独立したテーブル
  - 関係 = 「誰がどこに所属」「誰がどの試合に出た」 → 中間テーブル
- 「複数 ↔ 複数」の気配がしたら**多対多 = 中間テーブル**を疑う
- 文字列カラムに `,` 区切りで詰めるのは NG (検索・更新・整合性が壊れる)

---

## 多対多と中間テーブル

### パターン

A ⇔ A_B (中間) ⇔ B

### 中間テーブルのルール

- 主キーは**両カラムの組み合わせ** → 重複防止
- 外部キー (`references`) で参照整合性を保証
- `onDelete: 'cascade'` で親が消えたら関連行も自動削除 (ゴミデータ防止)

### 中間テーブルは「ただ繋ぐ」だけじゃない

関係そのものの情報を持てる:

- `match_participant.side` — どっちの陣営か
- `choujin_faction.joined_at` — いつ所属したか
- `tag_team_member.is_active` — 現役か元メンバーか

---

## 今回設計した関係

### 超人 ↔ 軍団 (多対多)

choujin ⇔ choujin_faction ⇔ faction

- 超人は複数軍団に所属できる (キン肉マン: 正義 + アイドル)
- 1軍団に複数超人が所属する
- → 中間テーブル `choujin_faction` で表現

### タッグチーム (将来追加するなら)

choujin ⇔ tag_team_member ⇔ tag_team

- 「2人組だから直接持てばいい」は罠
  - 3人組、同じメンバーで違う名前のチーム、過去のタッグ履歴 etc. に対応できなくなる
- 軍団と全く同じ多対多パターン

### 試合 (将来追加するなら)

choujin ⇔ match_participant ⇔ match → series (多対1)

- 試合と超人は多対多 (タッグなら1試合に4人)
- 試合とシリーズは多対1 → match に series_id を持つだけ
- match_participant に `side` (1 or 2) を持たせて陣営を表現

---

## ハマりやすい設計ミス

### NG 例 1: 文字列カラムに詰める

choujin.factions = "正義超人,アイドル超人"

- 検索が地獄、タイポに弱い、軍団自体に属性を持たせられない

### NG 例 2: カラムを増やす

choujin.faction1, faction2, faction3...

- 件数が増えるたびにスキーマ変更
- WHERE 条件が or の連発になる
- NULL だらけ

### NG 例 3: 実体を二重に分ける (試合設計でやらかし)

game(id, name) と result(id, team_1, team_2, ...)

- 試合の中身が両テーブルに分散して、どこを見ればいいか分からなくなる
- 1対1 の関係なら分ける必要なし → 1テーブルに統合

### NG 例 4: 不要な中間テーブル

- 1対1, 1対多 のときに中間テーブルは要らない
- 中間テーブルが必要なのは**多対多**のときだけ

---

## カラム命名の慣習

- TS 上は **camelCase** (`realName`, `heightCm`)
- DB 上は **snake_case** (`real_name`, `height_cm`)
- Drizzle は両方の表現をサポート: `realName: text('real_name')`
- 主キーは慣習で `id`
- 外部キーは `<参照先テーブル>_id` (例: `choujin_id`)

---

## Drizzle 固有のメモ

- `sqliteTable` の第3引数は **配列** で書く (オブジェクトは deprecated)

```ts
(table) => [primaryKey({ columns: [table.choujinId, table.factionId] })];
```

- リレーション機能 (`db.query.xxx.findMany({ with: ... })`) を使うには
  `relations()` の宣言が別途必要
- 型は自動生成:
  - `typeof table.$inferSelect` — SELECT 結果
  - `typeof table.$inferInsert` — INSERT 用

### リレーション

Drizzle にはリレーションの書き方が2つあって、役割が違います:

|                  | DB 制約(整合性チェック)      | レイヤー   |
| ---------------- | ---------------------------- | ---------- |
| **references()** | DB 制約(整合性チェック)      | DB レベル  |
| **relations()**  | クエリで JOIN を楽に書くため | ORM レベル |

1. **references()** — DBレベルの外部キー

```ts
choujinId: integer('choujin_id')
  .notNull()
  .references(() => choujin.id, { onDelete: 'cascade' }),
```

役割は DB 側のデータ整合性保証:

- 存在しない超人ID(例: 999)を中間テーブルに入れようとすると DB がエラーで弾く
- 親が削除されたら関連行も自動削除(cascade)

これは Drizzle がなくても、生 SQL でも同じことです。DB そのもののルール。

2. **relations()** — ORM レベルのリレーション宣言

```ts
export const choujinRelations = relations(choujin, ({ many }) => ({
  factions: many(choujinFaction)
}));
```

これは Drizzle の ORM 機能専用 で、SQL には影響しません。Drizzle のクエリビルダーに「テーブル同士の繋がり方」を教えるためのものです。

```ts
// 超人を取ると同時に、所属軍団も全部一緒に取ってくる
const result = await db.query.choujin.findFirst({
  where: eq(choujin.slug, 'kinnikuman'),
  with: {
    factions: {
      with: {
        faction: true
      }
    }
  }
});
```

結果はこうなります:

```json
{
  "id": 1,
  "name": "キン肉マン",
  "factions": [
    { "choujinId": 1, "factionId": 1, "faction": { "name": "正義超人" } },
    { "choujinId": 1, "factionId": 2, "faction": { "name": "アイドル超人" } }
  ]
}
```

1回のクエリで関連データもネストして取れるんです。
これが「ORM のリレーション機能」の本体です。

### なぜ両方必要なのか?

**references()** だけだと…
DB の整合性は守られる。でもクエリは自分で JOIN を書く必要がある:

```ts
// 自分で JOIN を書くパターン
const result = await db
  .select()
  .from(choujin)
  .leftJoin(choujinFaction, eq(choujin.id, choujinFaction.choujinId))
  .leftJoin(faction, eq(choujinFaction.factionId, faction.id))
  .where(eq(choujin.slug, 'kinnikuman'));
```

結果もフラットな形で返ってくるので、自分でネスト構造に組み立て直す必要があります。面倒。

**relations()** だけだと…
ORM のクエリは書きやすくなる。でもDB レベルの整合性は守られない(存在しない ID も入れ放題、カスケード削除も効かない)。

両方書くと…

- DB レベル: データの整合性が DB によって保証される(=安心)
- ORM レベル: db.query.xxx.findMany({ with: ... }) で楽にネスト取得できる(=DX)

```
┌─────────────────────────────────────────────┐
│  あなたのコード                              │
│  db.query.choujin.findMany({ with: ... })    │
└─────────────────┬───────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────┐
│  ORM レイヤー (Drizzle)                      │
│  ↑ relations() がここで使われる              │
│  「choujin と choujinFaction はこう繋がる」  │
│  → 内部で JOIN クエリに変換                  │
└─────────────────┬───────────────────────────┘
                  │
                  ▼ SQL
┌─────────────────────────────────────────────┐
│  DB レイヤー (SQLite/Turso)                  │
│  ↑ references() がここで効く                 │
│  「外部キー制約」「カスケード削除」           │
└─────────────────────────────────────────────┘
```

### relations の書き方のおさらい

```ts
export const choujinRelations = relations(choujin, ({ many }) => ({
  factions: many(choujinFaction)
}));
```

- 第1引数: どのテーブルのリレーション宣言か(= choujin)
- 第2引数: コールバックで関係を返す
  - many — 「この方向は 多 だよ」
  - one — 「この方向は 1 だよ」
- factions — クエリ側で with: { factions: ... } と書くときのプロパティ名

中間テーブル側の relations ではこう書きました:

```ts
export const choujinFactionRelations = relations(choujinFaction, ({ one }) => ({
  choujin: one(choujin, {
    fields: [choujinFaction.choujinId], // 自分側のキー
    references: [choujin.id] // 相手側のキー
  }),
  faction: one(faction, {
    fields: [choujinFaction.factionId],
    references: [faction.id]
  })
}));
```

one の場合だけ、どのカラムで繋がるかを教える必要があります(fields と references)。
many の場合は逆方向の one 定義から自動推測されます。

|                                               | おすすめ                                 |
| --------------------------------------------- | ---------------------------------------- |
| 1テーブルから関連データを取る(詳細ページなど) | **db.query.xxx.findMany({ with: ... })** |
| 複雑な条件で集計、絞り込み、ソート            | 自分で JOIN を書く db.select()           |
| とりあえず手軽にネストデータが欲しい          | db.query の方                            |

### まとめ

- references() = DB のルール(整合性)
- relations() = ORM の便利機能(楽な JOIN)
- 両方書くのが普通
- relations() を書かないと db.query.xxx.with が使えない
- references() を書かないと、DB がデータを守ってくれない

---

## 設計時のチェックリスト

新しい概念を追加するとき、まずこれを確認:

1. これは「実体」か「関係」か?
2. 既存テーブルとの関係は **1対1 / 1対多 / 多対多** のどれ?
3. 多対多なら → 中間テーブル
4. 中間テーブルに「関係そのものの情報」を持たせる必要はあるか?
5. 同じ実体を2つのテーブルに分けてないか?
6. 繰り返し参照される値(シリーズ名、軍団名など)はテーブル化されているか?
