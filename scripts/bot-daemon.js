/**
 * LETTR Bot Daemon — Automatic Content Seeding
 * 
 * Run alongside `npm run dev`:
 *   node scripts/bot-daemon.js
 * 
 * This script pings the seed-bots API at randomized intervals
 * between 5-10 minutes, simulating natural posting behavior.
 */

const BASE_URL = process.env.LETTR_URL || 'http://localhost:3000';
const MIN_INTERVAL_MS = 5 * 60 * 1000;   // 5 minutes
const MAX_INTERVAL_MS = 10 * 60 * 1000;  // 10 minutes

function getRandomInterval() {
  return Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS)) + MIN_INTERVAL_MS;
}

function formatTime(ms) {
  return `${Math.round(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

async function seedOnce() {
  const timestamp = new Date().toLocaleTimeString();
  try {
    const res = await fetch(`${BASE_URL}/api/cron/seed-bots`);
    const data = await res.json();
    
    if (data.success) {
      console.log(`[${timestamp}] ✅ ${data.bot} posted: "${data.post?.headline?.substring(0, 60)}..." (Score: ${data.post?.factScore})`);
    } else if (data.message) {
      console.log(`[${timestamp}] ⏭️  ${data.message}`);
    } else {
      console.log(`[${timestamp}] ⚠️  Unexpected response:`, JSON.stringify(data).substring(0, 100));
    }
  } catch (err) {
    console.error(`[${timestamp}] ❌ Daemon error: ${err.message}`);
  }
}

async function run() {
  console.log('==========================================');
  console.log('🤖 LETTR Bot Daemon Active');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Interval: ${MIN_INTERVAL_MS / 60000}-${MAX_INTERVAL_MS / 60000} minutes`);
  console.log('==========================================\n');

  // Immediate first seed
  await seedOnce();

  // Then loop with randomized intervals
  while (true) {
    const delay = getRandomInterval();
    console.log(`   ⏳ Next post in ${formatTime(delay)}...\n`);
    await new Promise(r => setTimeout(r, delay));
    await seedOnce();
  }
}

run();
