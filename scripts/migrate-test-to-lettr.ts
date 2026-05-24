/**
 * LETTR Migration Script: test → lettr (with FRAMES isolation)
 * 
 * Copies ONLY LETTR-owned collections from the 'test' database to 'lettr'.
 * Skips FRAMES-owned collections to prevent cross-project contamination.
 * 
 * - Preserves ObjectIds, timestamps, and relationships
 * - Skips duplicates (idempotent — safe to rerun)
 * - Copies indexes
 * - Reports counts before and after
 * - Validates auth users and posts
 * 
 * Usage:
 *   npx tsx scripts/migrate-test-to-lettr.ts
 * 
 * DO NOT run automatically. Review output before deploying.
 */

import { MongoClient, ObjectId } from 'mongodb';
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

// ─── LETTR-owned collections (based on model definitions + NextAuth JWT) ───
// Mongoose model 'User' → collection 'users'
// Mongoose model 'Post' → collection 'posts'
// NextAuth JWT strategy = no sessions/accounts collections needed
const LETTR_COLLECTIONS = new Set([
  'users',
  'posts',
]);

// ─── Known FRAMES collections to SKIP ───
// Add any FRAMES-specific collections here to be safe
const FRAMES_COLLECTIONS = new Set([
  'frames',
  'projects',
  'canvases',
  'layers',
  'assets',
  'templates',
  'workspaces',
]);

function isLettrCollection(name: string): boolean {
  // Definitely LETTR
  if (LETTR_COLLECTIONS.has(name)) return true;
  // Definitely FRAMES
  if (FRAMES_COLLECTIONS.has(name)) return false;
  // Unknown — will be flagged for manual review
  return false;
}

function isLettrUser(doc: any): boolean {
  // LETTR users have specific fields: role (READER/AUTHOR), isVerifiedAuthor, preferences
  return (
    doc.email &&
    (doc.role === 'READER' || doc.role === 'AUTHOR' || doc.isVerifiedAuthor !== undefined || doc.preferences !== undefined)
  );
}

function isLettrPost(doc: any): boolean {
  // LETTR posts have: headline, factScore, authorId
  return (
    doc.headline !== undefined &&
    doc.factScore !== undefined &&
    doc.authorId !== undefined
  );
}

async function migrate() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('  LETTR Database Migration: test → lettr');
  console.log('  (with FRAMES isolation)');
  console.log('═══════════════════════════════════════════════════════════\n');

  const client = new MongoClient(MONGODB_URI as string);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas.\n');

    const sourceDb = client.db(SOURCE_DB);
    const targetDb = client.db(TARGET_DB);

    // ── PHASE 1: Discover and classify collections ──
    const allCollections = await sourceDb.listCollections().toArray();
    const allNames = allCollections.map(c => c.name).filter(n => !n.startsWith('system.'));

    if (allNames.length === 0) {
      console.log(`⚠  No collections found in '${SOURCE_DB}'. Nothing to migrate.`);
      return;
    }

    console.log(`📦 Found ${allNames.length} collections in '${SOURCE_DB}':\n`);

    const lettrCollections: string[] = [];
    const framesCollections: string[] = [];
    const unknownCollections: string[] = [];

    for (const name of allNames) {
      const count = await sourceDb.collection(name).countDocuments();
      if (LETTR_COLLECTIONS.has(name)) {
        lettrCollections.push(name);
        console.log(`  ✅ LETTR    ${name.padEnd(25)} (${count} docs)`);
      } else if (FRAMES_COLLECTIONS.has(name)) {
        framesCollections.push(name);
        console.log(`  🚫 FRAMES   ${name.padEnd(25)} (${count} docs) — SKIPPING`);
      } else {
        // Inspect the first document to fingerprint
        const sample = await sourceDb.collection(name).findOne();
        const hasLettrFields = sample && (
          sample.headline !== undefined ||
          sample.factScore !== undefined ||
          sample.isVerifiedAuthor !== undefined ||
          sample.role === 'READER' || sample.role === 'AUTHOR'
        );

        if (hasLettrFields) {
          lettrCollections.push(name);
          console.log(`  ✅ LETTR*   ${name.padEnd(25)} (${count} docs) — auto-detected`);
        } else {
          unknownCollections.push(name);
          const fields = sample ? Object.keys(sample).slice(0, 6).join(', ') : 'empty';
          console.log(`  ⚠  UNKNOWN  ${name.padEnd(25)} (${count} docs) — fields: [${fields}]`);
        }
      }
    }

    console.log(`\n  Summary: ${lettrCollections.length} LETTR | ${framesCollections.length} FRAMES | ${unknownCollections.length} unknown\n`);

    if (unknownCollections.length > 0) {
      console.log('  ⚠  Unknown collections will be INCLUDED in migration (safe default).');
      console.log('  If any belong to FRAMES, add them to FRAMES_COLLECTIONS and rerun.\n');
      lettrCollections.push(...unknownCollections);
    }

    // ── PHASE 2: Pre-migration counts ──
    console.log('── PRE-MIGRATION COUNTS ──\n');
    const preCounts: Record<string, { source: number; target: number }> = {};

    for (const name of lettrCollections) {
      const sourceCount = await sourceDb.collection(name).countDocuments();
      const targetCount = await targetDb.collection(name).countDocuments();
      preCounts[name] = { source: sourceCount, target: targetCount };
      console.log(`  ${name.padEnd(25)} test: ${String(sourceCount).padStart(5)}  |  lettr: ${String(targetCount).padStart(5)}`);
    }

    // ── PHASE 3: Migrate LETTR collections ──
    console.log('\n── MIGRATING LETTR DATA ──\n');

    let totalCopied = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const name of lettrCollections) {
      const sourceColl = sourceDb.collection(name);
      const targetColl = targetDb.collection(name);
      const docs = await sourceColl.find({}).toArray();

      if (docs.length === 0) {
        console.log(`  ${name}: empty, skipping.`);
        continue;
      }

      let copied = 0;
      let skipped = 0;
      let filtered = 0;

      for (const doc of docs) {
        // Extra safety: filter out non-LETTR docs from shared collections
        if (name === 'users' && !isLettrUser(doc)) {
          filtered++;
          continue;
        }
        if (name === 'posts' && !isLettrPost(doc)) {
          filtered++;
          continue;
        }

        try {
          const existing = await targetColl.findOne({ _id: doc._id });
          if (existing) {
            skipped++;
            continue;
          }
          await targetColl.insertOne(doc);
          copied++;
        } catch (err: any) {
          if (err.code === 11000) {
            skipped++;
          } else {
            console.error(`  ❌ Error in ${name}:`, err.message);
            totalErrors++;
          }
        }
      }

      totalCopied += copied;
      totalSkipped += skipped;
      const filterMsg = filtered > 0 ? `  filtered: ${filtered} (non-LETTR)` : '';
      console.log(`  ${name.padEnd(25)} copied: ${String(copied).padStart(5)}  |  skipped: ${String(skipped).padStart(5)}${filterMsg}`);
    }

    // ── PHASE 4: Copy indexes ──
    console.log('\n── COPYING INDEXES ──\n');

    for (const name of lettrCollections) {
      try {
        const indexes = await sourceDb.collection(name).indexes();
        let synced = 0;
        for (const idx of indexes) {
          if (idx.name === '_id_') continue;
          try {
            const { key, ...options } = idx;
            delete (options as any).v;
            delete (options as any).ns;
            await targetDb.collection(name).createIndex(key, options);
            synced++;
          } catch (idxErr: any) {
            if (idxErr.code !== 85 && idxErr.code !== 86) {
              console.warn(`  ⚠  Index error on ${name}: ${idxErr.message}`);
            }
          }
        }
        console.log(`  ✅ ${name}: ${synced} indexes synced`);
      } catch (err: any) {
        console.warn(`  ⚠  Could not copy indexes for ${name}: ${err.message}`);
      }
    }

    // ── PHASE 5: Post-migration validation ──
    console.log('\n── POST-MIGRATION VALIDATION ──\n');

    let allMatch = true;
    for (const name of lettrCollections) {
      const sourceCount = preCounts[name].source;
      const targetCount = await targetDb.collection(name).countDocuments();
      const match = targetCount >= sourceCount;
      const status = match ? '✅' : '❌';
      if (!match) allMatch = false;
      console.log(`  ${status} ${name.padEnd(25)} test: ${String(sourceCount).padStart(5)}  →  lettr: ${String(targetCount).padStart(5)}`);
    }

    // Validate specific LETTR data integrity
    console.log('\n── DATA INTEGRITY CHECKS ──\n');

    // Check users
    const userCount = await targetDb.collection('users').countDocuments();
    const botCount = await targetDb.collection('users').countDocuments({
      email: { $regex: /@lettr\.ai$/i }
    });
    const authorCount = await targetDb.collection('users').countDocuments({
      isVerifiedAuthor: true
    });
    console.log(`  Users total:     ${userCount}`);
    console.log(`  Bot accounts:    ${botCount}`);
    console.log(`  Verified authors: ${authorCount}`);
    console.log(`  ${userCount > 0 ? '✅' : '❌'} Users exist in lettr`);

    // Check posts
    const postCount = await targetDb.collection('posts').countDocuments();
    const publishedCount = await targetDb.collection('posts').countDocuments({ isPublished: true });
    const withFactScore = await targetDb.collection('posts').countDocuments({ factScore: { $exists: true, $gt: 0 } });
    console.log(`  Posts total:     ${postCount}`);
    console.log(`  Published:       ${publishedCount}`);
    console.log(`  With factScore:  ${withFactScore}`);
    console.log(`  ${postCount > 0 ? '✅' : '❌'} Posts exist in lettr`);

    // Check referential integrity: do post authorIds reference valid users?
    const samplePosts = await targetDb.collection('posts').find({}).limit(10).toArray();
    let validRefs = 0;
    let brokenRefs = 0;
    for (const post of samplePosts) {
      if (post.authorId) {
        const author = await targetDb.collection('users').findOne({ _id: post.authorId });
        if (author) validRefs++;
        else brokenRefs++;
      }
    }
    console.log(`  Referential integrity (10 sample posts): ${validRefs} valid, ${brokenRefs} broken`);
    console.log(`  ${brokenRefs === 0 ? '✅' : '⚠ '} AuthorId references`);

    // ── SUMMARY ──
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`  LETTR collections migrated: ${lettrCollections.length}`);
    console.log(`  FRAMES collections skipped: ${framesCollections.length}`);
    console.log(`  Documents copied:           ${totalCopied}`);
    console.log(`  Duplicates skipped:         ${totalSkipped}`);
    console.log(`  Errors:                     ${totalErrors}`);
    console.log(`  Counts match:               ${allMatch ? '✅ YES' : '❌ NO'}`);
    console.log();

    if (allMatch && totalErrors === 0) {
      console.log('  ✅ Migration complete and validated!');
      console.log('  The app will use the "lettr" database (dbName enforced in code).\n');
      console.log('  NEXT STEPS:');
      console.log('  1. Deploy the new code (already uses dbName: "lettr")');
      console.log('  2. Verify login, posts, and bots on production');
      console.log('  3. Keep "test" database as backup — do NOT delete yet');
    } else {
      console.log('  ⚠  Review issues above. Migration is idempotent — safe to rerun.');
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
