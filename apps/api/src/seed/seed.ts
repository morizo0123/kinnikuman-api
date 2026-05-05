import 'dotenv/config';
import { db } from '../db/index.js';
import { choujin, faction, choujinFaction } from '../db/schema.js';
import { choujinSeed, factionsSeed } from './data.js';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🌱 シード開始...');

  // 1. 既存データを全削除(冪等性のため)
  console.log('  既存データを削除中...');
  await db.delete(choujinFaction);
  await db.delete(choujin);
  await db.delete(faction);

  // 2. 軍団を投入
  console.log('  軍団を投入中...');
  await db.insert(faction).values([...factionsSeed]);

  // 3. 軍団の slug → id を取得(後で中間テーブルで使う)
  const factionRows = await db.select().from(faction);
  const factionIdBySlug = new Map(factionRows.map((row) => [row.slug, row.id]));

  // 4. 超人を投入(factionSlugs を除いた本体データのみ)
  console.log('  超人を投入中...');
  for (const c of choujinSeed) {
    const { factionSlugs, ...choujinData } = c;
    const [inserted] = await db
      .insert(choujin)
      .values(choujinData)
      .returning({ id: choujin.id });

    // 5. 中間テーブル(choujin_faction)を投入
    const choujinId = inserted.id;
    const relations = factionSlugs.map((slug) => ({
      choujinId,
      factionId: factionIdBySlug.get(slug)!
    }));

    if (relations.length > 0) {
      await db.insert(choujinFaction).values(relations);
    }
  }

  console.log('✅ シード完了');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ シード失敗:', err);
  process.exit(1);
});
