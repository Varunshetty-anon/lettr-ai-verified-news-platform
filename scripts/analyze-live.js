async function analyzePosts() {
  console.log("Fetching live posts from lettr-news.onrender.com...");
  const res = await fetch("https://lettr-news.onrender.com/api/posts?sort=recent");
  if (!res.ok) {
    console.error("Failed to fetch:", res.status);
    return;
  }
  
  const data = await res.json();
  const posts = data.posts || [];
  
  console.log(`\n=== QA ANALYSIS FOR ${posts.length} POSTS ===\n`);
  
  let fails = 0;
  
  for (let i = 0; i < Math.min(30, posts.length); i++) {
    const post = posts[i];
    console.log(`\n--- POST ${i+1}: [${post.category}] ${post.headline} ---`);
    
    // Headline QA
    if (post.headline.length > 150) {
      console.log(`[FAIL] Headline too long: ${post.headline.length} chars`);
      fails++;
    }
    
    // Body QA
    const wordCount = post.description ? post.description.split(/\s+/).length : 0;
    if (wordCount < 100) {
      console.log(`[FAIL] Article body too short: ${wordCount} words`);
      fails++;
    }
    if (post.description && post.description.includes("Article URL")) {
      console.log(`[FAIL] Sanitization issue: contains "Article URL"`);
      fails++;
    }
    if (post.description && post.description.includes("Comments URL")) {
      console.log(`[FAIL] Sanitization issue: contains "Comments URL"`);
      fails++;
    }
    
    // Explanation QA
    const summary = post.factSummary || "";
    if (summary.includes("automated assessment") || summary.length < 30) {
      console.log(`[FAIL] Bad explanation: ${summary}`);
      fails++;
    }
    
    console.log(`Score: ${post.factScore} | Confidence: ${post.confidence} | Summary length: ${summary.length} | Body words: ${wordCount}`);
  }
  
  console.log(`\nTotal failures in sample: ${fails}`);
}

analyzePosts();
