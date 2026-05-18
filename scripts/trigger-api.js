const https = require('https');

function makeRequest(url, label) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`[${label}] STATUS: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          if (parsed.seeded && parsed.seeded.length > 0) {
            console.log(`[${label}] SEEDED ${parsed.seeded.length} posts:`);
            parsed.seeded.forEach(s => console.log(`  - "${s.headline}" [${s.category}] Score: ${s.factScore}`));
          } else if (parsed.seeded) {
            console.log(`[${label}] No new posts seeded this run.`);
          } else {
            console.log(`[${label}] Response:`, data.substring(0, 200));
          }
        } catch {
          console.log(`[${label}] Raw:`, data.substring(0, 200));
        }
        resolve();
      });
    }).on('error', (err) => {
      console.error(`[${label}] ERROR:`, err.message);
      resolve();
    });
  });
}

async function main() {
  console.log("=== SEEDING FRESH CONTENT (5 rounds, 8s apart) ===\n");
  for (let i = 1; i <= 5; i++) {
    console.log(`\n--- Round ${i} ---`);
    await makeRequest('https://lettr-news.onrender.com/api/cron/seed-bots', `Seed-${i}`);
    if (i < 5) {
      console.log(`Waiting 8 seconds...`);
      await new Promise(r => setTimeout(r, 8000));
    }
  }
  console.log("\n=== COMPLETE ===");
}

main();
