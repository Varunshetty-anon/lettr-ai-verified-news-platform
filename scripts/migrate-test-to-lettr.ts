/**
 * Migration Script: test → lettr
 * 
 * Copies all collections from the default 'test' database to the 'lettr' database.
 * - Preserves ObjectIds, timestamps, and relationships
 * - Skips duplicates (idempotent — safe to rerun)
 * - Reports counts before and after
 * 
 * Usage:
 *   npx tsx scripts/migrate-test-to-lettr.ts
 * 
 * IMPORTANT: Run this BEFORE deploying the new code that uses dbName: 'lettr'.
 * After confirming migration, deploy the new code.
 */

import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not set in .env.local');
  process.exit(1);
}

const SOURCE_DB = 'test';
const TARGET_DB = 'lettr';

async function migrate() {
  console.log('═══════════════════════════════════════════════');
  console.log(`  LETTR Migration: ${SOURCE_DB} → ${TARGET_DB}`);
  console.log('═══════════════════════════════════════════════\n');

  const client = new MongoClient(MONGODB_URI as string);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas.\n');

    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    // Discover all collections in source
    const collections = await sourceDb.listCollections().toArray();
    const collectionNames = collections.map(c => c.name).filter(n => !n.startsWith('system.'));

    if (collectionNames.length === 0) {
      console.log(`⚠  No collections found in '${SOURCE_DB}'. Nothing to migrate.`);
      return;
    }

    console.log(`📦 Found ${collectionNames.length} collections in '${SOURCE_DB}':`);
    console.log(`   ${collectionNames.join(', ')}\n`);

    // Phase 1: Pre-migration counts
    console.log('── PRE-MIGRATION COUNTS ──\n');
    const preCounts: Record<string, { source: number; target: number }> = {};

    for (const name of collectionNames) {
      const sourceCount = await sourceDb.collection(name).countDocuments();
      const targetCount = await targetDb.collection(name).countDocuments();
      preCounts[name] = { source: sourceCount, target: targetCount };
      console.log(`  ${name.padEnd(25)} source: ${String(sourceCount).padStart(5)}  |  target: ${String(targetCount).padStart(5)}`);
    }

    // Phase 2: Migrate each collection
    console.log('\n── MIGRATING ──\n');

    let totalCopied = 0;
    let totalSkipped = 0;

    for (const name of collectionNames) {
      const sourceColl = sourceDb.collection(name);
      const targetColl = targetDb.collection(name);

      const docs = await sourceColl.find({}).toArray();

      if (docs.length === 0) {
        console.log(`  ${name}: empty, skipping.`);
        continue;
      }

      let copied = 0;
      let skipped = 0;

      for (const doc of docs) {
        try {
          // Check if document with same _id already exists in target
          const existing = await targetColl.findOne({ _id: doc._id });
          if (existing) {
            skipped++;
            continue;
          }

          // Insert preserving the original _id, timestamps, and all fields
          await targetColl.insertOne(doc);
          copied++;
        } catch (err: any) {
          if (err.code === 11000) {
            // Duplicate key — already exists
            skipped++;
          } else {
            console.error(`  ❌ Error migrating doc in ${name}:`, err.message);
          }
        }
      }

      totalCopied += copied;
      totalSkipped += skipped;
      console.log(`  ${name.padEnd(25)} copied: ${String(copied).padStart(5)}  |  skipped: ${String(skipped).padStart(5)} (duplicates)`);
    }

    // Phase 3: Post-migration counts
    console.log('\n── POST-MIGRATION COUNTS ──\n');

    let allMatch = true;
    for (const name of collectionNames) {
      const sourceCount = preCounts[name].source;
      const targetCount = await targetDb.collection(name).countDocuments();
      const match = targetCount >= sourceCount;
      const status = match ? '✅' : '❌';
      if (!match) allMatch = false;
      console.log(`  ${status} ${name.padEnd(25)} source: ${String(sourceCount).padStart(5)}  |  target: ${String(targetCount).padStart(5)}`);
    }

    // Phase 4: Copy indexes
    console.log('\n── COPYING INDEXES ──\n');

    for (const name of collectionNames) {
      try {
        const indexes = await sourceDb.collection(name).indexes();
        for (const idx of indexes) {
          if (idx.name === '_id_') continue; // Skip default _id index
          try {
            const { key, ...options } = idx;
            // Remove internal fields not accepted by createIndex
            delete (options as any).v;
            delete (options as any).ns;
            await targetDb.collection(name).createIndex(key, options);
          } catch (idxErr: any) {
            if (idxErr.code !== 85 && idxErr.code !== 86) {
              // 85 = index already exists with same name, 86 = index already exists with different options
              console.warn(`  ⚠  Index error on ${name}: ${idxErr.message}`);
            }
          }
        }
        console.log(`  ✅ ${name}: indexes synced`);
      } catch (err: any) {
        console.warn(`  ⚠  Could not copy indexes for ${name}: ${err.message}`);
      }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════');
    console.log('  MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════\n');
    console.log(`  Collections migrated: ${collectionNames.length}`);
    console.log(`  Documents copied:     ${totalCopied}`);
    console.log(`  Duplicates skipped:   ${totalSkipped}`);
    console.log(`  All counts match:     ${allMatch ? '✅ YES' : '❌ NO'}`);
    console.log();

    if (allMatch) {
      console.log('  ✅ Migration complete! You can now deploy the new code.');
      console.log('  The app will use the "lettr" database automatically.\n');
      console.log('  ⚠  DO NOT delete the "test" database yet — keep it as backup.');
    } else {
      console.log('  ⚠  Some counts do not match. Review the output above.');
      console.log('  The migration is idempotent — safe to rerun.\n');
    }

  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔒 Connection closed.');
    process.exit(0);
  }
}

migrate();
