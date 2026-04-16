import fetch from 'node-fetch';

const PORT = 3000;
const URL = `http://localhost:${PORT}/api/cron/seed-bots`;

const MIN_INTERVAL = 300000; // 5 minutes
const MAX_INTERVAL = 900000; // 15 minutes

function getRandomInterval() {
  return Math.floor(Math.random() * (MAX_INTERVAL - MIN_INTERVAL + 1)) + MIN_INTERVAL;
}

async function triggerBotSeeding() {
  console.log(`[BOT ENGINE] Triggering Seeding Pipeline at ${new Date().toISOString()}`);
  
  try {
    const response = await fetch(URL);
    if (!response.ok) {
        throw new Error(`Invalid response code: ${response.status}`);
    }
    const data = await response.json();
    console.log(`[BOT ENGINE] Result:`, data);
  } catch (err) {
    console.error(`[BOT ENGINE] Pipeline Error: ${err.message}`);
  }

  const nextWait = getRandomInterval();
  console.log(`[BOT ENGINE] Sleeping for ${Math.round(nextWait / 60000)} minutes...`);
  setTimeout(triggerBotSeeding, nextWait);
}

// Auto-start
console.log("==========================================");
console.log("🤖 LETTR BOT ENGINE DAEMON STARTED");
console.log("==========================================");
triggerBotSeeding();
