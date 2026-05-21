# JOIN メモ

## JOIN とは

- **2つのテーブルを横にくっつける**操作
- 関連するテーブルのデータを1つの結果にまとめて取れる

---

## 基本の動き

### くっつける前

```
choujin                  choujin_faction
┌────┬──────────┐        ┌──────────┬──────────┐
│ id │ name     │        │choujin_id│faction_id│
├────┼──────────┤        ├──────────┼──────────┤
│  3 │キン肉マン. │        │    3     │    1     │
│  4 │テリーマン. │        │    3     │    2     │
└────┴──────────┘        │    4     │    1     │
                         │    4     │    2     │
                         └──────────┴──────────┘
```

### くっつけた後

`choujin INNER JOIN choujin_faction ON choujin.id = choujin_faction.choujin_id`

```
┌────┬──────────┬──────────┬──────────┐
│ id │ name     │choujin_id│faction_id│
├────┼──────────┼──────────┼──────────┤
│  3 │キン肉マン│    3     │    1     │  ← (キン肉マン, seigi)
│  3 │キン肉マン│    3     │    2     │  ← (キン肉マン, idol)
│  4 │テリーマン│    4     │    1     │  ← (テリーマン, seigi)
│  4 │テリーマン│    4     │    2     │  ← (テリーマン, idol)
└────┴──────────┴──────────┴──────────┘
```

- `choujin.id` と `choujin_faction.choujin_id` が一致する行同士を組み合わせる
- 中間テーブルに複数該当があれば、その分だけ横並びの行が増える

---

## ON の役割

- `ON A.x = B.y` で「**どう繋ぐか**」を指定
- 「A の x と B の y が一致する行をくっつけてね」
- ないとエラー(どう繋ぐか分からない)

---

## 3テーブルを繋ぐ

中間テーブルを挟んで2回 JOIN する:

choujin
└ INNER JOIN choujin_faction ON choujin.id = choujin_faction.choujin_id
└ INNER JOIN faction ON choujin_faction.faction_id = faction.id

結果(1行 = 「ある超人がある軍団に所属している」という事実):

```
┌────┬──────────┬──────────┬──────────┬────┬───────┐
│ id │ name     │choujin_id│faction_id│ id │ slug  │
├────┼──────────┼──────────┼──────────┼────┼───────┤
│  3 │キン肉マン│    3     │    1     │  1 │ seigi │
│  3 │キン肉マン│    3     │    2     │  2 │ idol  │
│  4 │テリーマン│    4     │    1     │  1 │ seigi │
│  4 │テリーマン│    4     │    2     │  2 │ idol  │
└────┴──────────┴──────────┴──────────┴────┴───────┘
```

---

## WHERE で絞る

`WHERE faction.slug = 'seigi'` で seigi の行だけ残す:

┌────┬──────────┬──────────┬──────────┬────┬───────┐
│ 3 │キン肉マン│ 3 │ 1 │ 1 │ seigi │
│ 4 │テリーマン│ 4 │ 1 │ 1 │ seigi │
└────┴──────────┴──────────┴──────────┴────┴───────┘

最後に欲しい列だけ取り出す `SELECT choujin.id`:

[3, 4]

---

## JOIN の種類

| 種類           | 意味                                     |
| -------------- | ---------------------------------------- |
| **INNER JOIN** | 両方のテーブルに該当行がある場合だけ残す |
| LEFT JOIN      | 左テーブル全部 + 右に該当があれば追加    |
| RIGHT JOIN     | 右テーブル全部 + 左に該当があれば追加    |
| FULL JOIN      | 両方の全部                               |

- 今回 INNER を使う理由: 「軍団で絞る」ので、軍団がない超人は除外されるのが正しい
- もし「軍団なしの超人も含めたい」なら LEFT JOIN

---

## Drizzle での書き方

```ts
const ids = await db
  .select({ id: choujin.id }) // 最後に取り出す列
  .from(choujin) // 起点のテーブル
  .innerJoin(choujinFaction, eq(choujin.id, choujinFaction.choujinId)) // 1段目
  .innerJoin(faction, eq(choujinFaction.factionId, faction.id)) // 2段目
  .where(eq(faction.slug, factionSlug)); // 絞り込み
```

### 読む順番

1. `from(choujin)` — 起点
2. `.innerJoin(...)` — 横に繋ぐ(複数回 OK)
3. `.where(...)` — 条件で絞る
4. `.select({...})` — 欲しい列だけ取る

- SQL は `SELECT` が先頭だが、Drizzle は `.select()` を最後に書ける
- メソッドチェーンで上から処理を追える

---

## イメージ

- JOIN = テーブルを横にくっつける
- ON = くっつけ方の指定
- WHERE = くっついた表から条件で行を絞る
- SELECT = 最後に欲しい列だけ取る

→ **地図上で道を辿る感覚**: faction → 中間 → choujin と繋いで、欲しいデータに辿り着く

---

## Drizzle のコード

```ts
const ids = await db
  .select({ id: choujin.id }) // ← 最後に取り出す列
  .from(choujin) // ← 出発点のテーブル
  .innerJoin(choujinFaction, eq(choujin.id, choujinFaction.choujinId)) // ← 1段目の JOIN
  .innerJoin(faction, eq(choujinFaction.factionId, faction.id)) // ← 2段目の JOIN
  .where(eq(faction.slug, factionSlug)); // ← 絞り込み
```

1 from(choujin) — choujin テーブルを起点に
2 .innerJoin(choujinFaction, ...) — choujin_faction を横に繋ぐ
3 .innerJoin(faction, ...) — さらに faction を横に繋ぐ
4 .where(eq(faction.slug, factionSlug)) — slug が 'seigi' の行だけ残す
5 .select({ id: choujin.id }) — choujin.id だけ取り出す

読む順番に書くのが Drizzle の良いところ(SQL は SELECT が先に来るけど、Drizzle は最後でも書ける)。

---

## 「inner」って何?

JOIN には種類があります(豆知識):

INNER: JOIN両方のテーブルに該当行がある場合だけ残す ← 今回使ってる
LEFT: JOIN左テーブル全部 + 右に該当があれば追加
RIGHT: JOIN右テーブル全部 + 左に該当があれば追加
FULL: JOIN両方の全部

例えば、もし「所属軍団がない超人」がいる場合、INNER JOIN だとその超人は結果に出てきません(中間テーブルに該当行がないから)。
今回のケースでは「軍団指定でフィルタしたい」ので、軍団がない超人は除外されるのが正しい。だから INNER JOIN。

---

## まとめ

`from(choujin)`: 起点
`innerJoin(choujinFaction, ON ...)`: 中間テーブルと横に繋ぐ
`innerJoin(faction, ON ...)`: 軍団テーブルとも横に繋ぐ
`where(eq(faction.slug, 'seigi'))`: seigi の行だけ残す
`select({ id: choujin.id })`: choujin.id 列だけ取る

3つのテーブルを横にくっつけて、条件で絞って、欲しい列だけ取る。地図上で道を辿る感覚に近いです。
