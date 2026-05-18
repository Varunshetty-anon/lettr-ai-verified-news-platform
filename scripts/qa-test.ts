import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkQuality() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const Post = mongoose.models.Post || mongoose.model('Post', new mongoose.Schema({
    headline: String,
    body: String,
    category: String,
    factSummary: String,
    createdAt: Date,
    isPublished: Boolean
  }, { collection: 'posts' }));

  // Get the most recent 30 published posts
  const recentPosts = await Post.find({ isPublished: true }).sort({ createdAt: -1 }).limit(30);

  if (recentPosts.length === 0) {
    console.log("NO POSTS FOUND. Bots have not seeded yet.");
    process.exit(0);
  }

  console.log(`Analyzing ${recentPosts.length} fresh posts...\n`);

  let passed = 0;
  let failed = 0;

  for (const post of recentPosts) {
    let reasons = [];
    
    // Check Headline
    if (/\[.*?\]/g.test(post.headline) || /&amp;|&lt;|&gt;/.test(post.headline)) {
      reasons.push("HEADLINE FAIL: Contains tags or raw HTML entities.");
    }
    
    // Check Body
    if (post.body.includes('Article URL') || post.body.includes('Comments URL')) {
      reasons.push("BODY FAIL: Contains scraper artifacts.");
    }
    if (post.body.length < 400) {
      reasons.push(`BODY FAIL: Too short (${post.body.length} chars). Mid-sentence cut?`);
    }

    // Check Categories
    if (post.category.includes('Indian') && (post.headline.includes('Trump') || post.headline.includes('Biden'))) {
       reasons.push("CATEGORY FAIL: Donald Trump/Global news in Indian category.");
    }

    // Check AI Reasoning
    if (!post.factSummary || post.factSummary.includes('Internal System Error') || post.factSummary.includes('appears mostly factual based on current events')) {
      reasons.push("AI REASONING FAIL: Generic boilerplate or error detected.");
    }

    if (reasons.length > 0) {
      console.log(`[FAIL] ${post.headline}`);
      reasons.forEach(r => console.log(`       -> ${r}`));
      failed++;
    } else {
      console.log(`[PASS] ${post.headline}`);
      console.log(`       Category: ${post.category}`);
      console.log(`       Reasoning: "${post.factSummary.substring(0, 100)}..."\n`);
      passed++;
    }
  }

  console.log(`\n================================`);
  console.log(`FINAL REPORT: ${passed} PASS, ${failed} FAIL`);
  console.log(`================================\n`);
  
  process.exit(0);
}

checkQuality().catch(console.error);
