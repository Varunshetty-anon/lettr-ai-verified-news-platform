const https = require('https');

function fetchJSON(url, label) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`\n[${label}] STATUS: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          console.log(`[${label}] RESPONSE:`, JSON.stringify(parsed, null, 2).substring(0, 800));
          resolve(parsed);
        } catch {
          console.log(`[${label}] Raw:`, data.substring(0, 300));
          resolve(null);
        }
      });
    }).on('error', (err) => {
      console.error(`[${label}] ERROR:`, err.message);
      resolve(null);
    });
  });
}

async function main() {
  console.log("=== PHASE 4.5 POST-FIX VALIDATION ===\n");
  const cronSecret = process.env.CRON_SECRET || 'lettr_cleanup_999'; // fallback for legacy usage if not set

  // 1. Fix categories on existing posts
  console.log("1. FIXING CATEGORIES ON EXISTING POSTS...");
  await fetchJSON(`https://lettr-news.onrender.com/api/cron/fix-categories?secret=${cronSecret}`, 'Fix-Categories');

  // 2. Seed 3 rounds of fresh content with new processor + OG images
  for (let i = 1; i <= 3; i++) {
    console.log(`\n${i+1}. SEEDING ROUND ${i}...`);
    await fetchJSON('https://lettr-news.onrender.com/api/cron/seed-bots', `Seed-${i}`);
    if (i < 3) {
      console.log("Waiting 10 seconds...");
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // 3. Run QA
  console.log("\n\n5. RUNNING FINAL QA...");
  await new Promise(r => setTimeout(r, 3000));
  const qa = await fetchJSON(`https://lettr-news.onrender.com/api/cron/qa?secret=${cronSecret}`, 'QA');

  if (qa) {
    console.log("\n\n=== FINAL QA SUMMARY ===");
    console.log(`AI Reasoning: ${qa.aiReasoning.specific} specific, ${qa.aiReasoning.generic} generic`);
    console.log(`Score Distribution:`, qa.scores);
    console.log(`Headlines: ${qa.headlines.pass}/${qa.totalPosts} pass`);
    console.log(`Bodies: ${qa.bodies.pass}/${qa.totalPosts} pass`);
    console.log(`Categories:`, qa.categories);
    console.log(`Media: ${qa.media.coveragePercent}% coverage (${qa.media.withImage} img, ${qa.media.withVideo} vid, ${qa.media.noMedia} none)`);
    
    if (qa.detailedPosts?.length > 0) {
      console.log("\n--- LATEST POSTS ---");
      for (const p of qa.detailedPosts.slice(0, 5)) {
        console.log(`  "${p.headline}" [${p.category}] Score:${p.factScore} Img:${p.hasImage} Vid:${p.hasVideo}`);
        console.log(`     Reasoning: "${p.reasoningPreview.substring(0, 150)}..."`);
      }
    }
  }

  console.log("\n=== COMPLETE ===");
}

main();
