import {
  sqliteTable,
  integer,
  text,
  primaryKey
} from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ===== 超人テーブル =====
export const choujin = sqliteTable('choujin', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  realName: text('real_name'),
  power: text('power'),
  origin: text('origin'),
  heightCm: integer('height_cm'),
  weightKg: integer('weight_kg'),
  description: text('description'),
  createdAt: text('created_at')
    .notNull()
    .$defaultFn(() => new Date().toISOString())
});

// ===== 軍団テーブル =====
export const faction = sqliteTable('faction', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull()
});

// ===== 中間テーブル(超人 ↔ 軍団) =====
export const choujinFaction = sqliteTable(
  'choujin_faction',
  {
    choujinId: integer('choujin_id')
      .notNull()
      .references(() => choujin.id, { onDelete: 'cascade' }),
    factionId: integer('faction_id')
      .notNull()
      .references(() => faction.id, { onDelete: 'cascade' })
  },
  (table) => ({
    pk: primaryKey({ columns: [table.choujinId, table.factionId] })
  })
);

// ===== リレーション定義(Drizzleクエリで JOIN するため) =====
export const choujinRelations = relations(choujin, ({ many }) => ({
  factions: many(choujinFaction)
}));

export const factionRelations = relations(faction, ({ many }) => ({
  choujins: many(choujinFaction)
}));

export const choujinFactionRelations = relations(choujinFaction, ({ one }) => ({
  choujin: one(choujin, {
    fields: [choujinFaction.choujinId],
    references: [choujin.id]
  }),
  faction: one(faction, {
    fields: [choujinFaction.factionId],
    references: [faction.id]
  })
}));

// ===== 型のエクスポート(他ファイルから import { Choujin } で使える) =====
export type Choujin = typeof choujin.$inferSelect;
export type NewChoujin = typeof choujin.$inferInsert;
export type Faction = typeof faction.$inferSelect;
export type NewFaction = typeof faction.$inferInsert;
