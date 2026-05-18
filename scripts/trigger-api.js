const fs = require('fs');

async function checkPosts() {
  console.log("Fetching live posts from production...");
  try {
    const res = await fetch("https://lettr-news.onrender.com/api/posts?sort=recent");
    if (!res.ok) {
      console.log("Failed. Status:", res.status);
      const text = await res.text();
      console.log("HTML:", text.substring(0, 200));
      return;
    }
    const data = await res.json();
    console.log(`Fetched ${data.posts?.length || 0} posts.`);

    let passed = 0;
    let failed = 0;

    for (const post of (data.posts || [])) {
      let reasons = [];
      const headline = post.headline || '';
      const bodyText = post.body || post.description || '';
      const factSummary = post.factSummary || post.reasoning || '';
      
      // Check Headline
      if (/\[.*?\]/g.test(headline) || /&amp;|&lt;|&gt;/.test(headline)) {
        reasons.push("HEADLINE FAIL: Contains tags or raw HTML entities.");
      }
      
      // Check Body
      if (bodyText.includes('Article URL') || bodyText.includes('Comments URL')) {
        reasons.push("BODY FAIL: Contains scraper artifacts.");
      }
      if (bodyText.length < 300) {
        reasons.push(`BODY FAIL: Too short (${bodyText.length} chars).`);
      }

      // Check Categories
      if (post.category && post.category.includes('Indian') && (headline.includes('Trump') || headline.includes('Biden'))) {
         reasons.push("CATEGORY FAIL: Donald Trump/Global news in Indian category.");
      }

      // Check AI Reasoning
      if (!factSummary || factSummary.includes('Internal System Error') || factSummary.includes('appears mostly factual based on current events')) {
        reasons.push(`AI REASONING FAIL: ${factSummary}`);
      }

      if (reasons.length > 0) {
        console.log(`\n[FAIL] ${headline}`);
        reasons.forEach(r => console.log(`       -> ${r}`));
        failed++;
      } else {
        console.log(`\n[PASS] ${headline}`);
        console.log(`       Category: ${post.category}`);
        console.log(`       Reasoning: "${factSummary.substring(0, 100)}..."`);
        passed++;
      }
    }

    console.log(`\n================================`);
    console.log(`FINAL REPORT: ${passed} PASS, ${failed} FAIL`);
    console.log(`================================\n`);

  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

checkPosts();
