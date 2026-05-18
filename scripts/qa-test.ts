import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runQA() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.\n');

  const Post = mongoose.models.Post || mongoose.model('Post', new mongoose.Schema({
    headline: String,
    description: String,
    body: String,
    category: String,
    factScore: Number,
    factSummary: String,
    confidence: String,
    sourcesChecked: Number,
    issues: [String],
    imageUrl: String,
    videoUrl: String,
    sourceLink: String,
    originSource: String,
    isPublished: Boolean,
    createdAt: Date
  }, { collection: 'posts' }));

  const posts = await Post.find({ isPublished: true }).sort({ createdAt: -1 }).limit(30);
  console.log(`=== PHASE 4.5 BRUTAL QA: ${posts.length} POSTS ===\n`);

  // ─── TEST 1: AI FACT CHECK INTELLIGENCE ───
  console.log('═══════════════════════════════════════');
  console.log('TEST 1: AI FACT CHECK INTELLIGENCE');
  console.log('═══════════════════════════════════════\n');

  let genericReasoningCount = 0;
  let specificReasoningCount = 0;
  let noReasoningCount = 0;
  let errorReasoningCount = 0;

  const GENERIC_PHRASES = [
    'automated assessment',
    'appears mostly factual',
    'based on current events',
    'internal system error',
    'demo safe mode',
    'analysis complete',
    'no summary provided',
  ];

  for (const post of posts) {
    const summary = (post.factSummary || '').toLowerCase();
    
    if (!post.factSummary || post.factSummary.length < 20) {
      noReasoningCount++;
    } else if (GENERIC_PHRASES.some(p => summary.includes(p))) {
      genericReasoningCount++;
      console.log(`  [GENERIC] "${post.headline}"`);
      console.log(`    Reasoning: "${post.factSummary?.substring(0, 120)}..."`);
    } else if (summary.includes('error') || summary.includes('failed')) {
      errorReasoningCount++;
      console.log(`  [ERROR] "${post.headline}"`);
      console.log(`    Reasoning: "${post.factSummary?.substring(0, 120)}..."`);
    } else {
      specificReasoningCount++;
    }
  }

  console.log(`\n  RESULTS:`);
  console.log(`    Specific/contextual reasoning: ${specificReasoningCount}/${posts.length}`);
  console.log(`    Generic boilerplate reasoning: ${genericReasoningCount}/${posts.length}`);
  console.log(`    Error-state reasoning: ${errorReasoningCount}/${posts.length}`);
  console.log(`    Missing reasoning: ${noReasoningCount}/${posts.length}`);
  
  const reasoningPassRate = specificReasoningCount / posts.length;
  console.log(`\n  ${reasoningPassRate >= 0.5 ? '✅ PASS' : '❌ FAIL'}: ${(reasoningPassRate * 100).toFixed(0)}% of posts have contextual reasoning`);
  
  // Show 3 examples of the BEST reasoning
  console.log(`\n  TOP 3 AI REASONING EXAMPLES:`);
  const bestPosts = posts
    .filter(p => p.factSummary && p.factSummary.length > 50 && !GENERIC_PHRASES.some(g => p.factSummary!.toLowerCase().includes(g)))
    .sort((a, b) => (b.factSummary?.length || 0) - (a.factSummary?.length || 0))
    .slice(0, 3);
  
  for (const p of bestPosts) {
    console.log(`\n  📰 "${p.headline}"`);
    console.log(`     Score: ${p.factScore} | Confidence: ${p.confidence}`);
    console.log(`     Reasoning: "${p.factSummary}"`);
  }

  // ─── TEST 2: FACT SCORE DISTRIBUTION ───
  console.log('\n\n═══════════════════════════════════════');
  console.log('TEST 2: FACT SCORE DISTRIBUTION');
  console.log('═══════════════════════════════════════\n');

  const scoreBuckets = { '90-100': 0, '75-89': 0, '50-74': 0, '0-49': 0 };
  for (const post of posts) {
    const s = post.factScore || 0;
    if (s >= 90) scoreBuckets['90-100']++;
    else if (s >= 75) scoreBuckets['75-89']++;
    else if (s >= 50) scoreBuckets['50-74']++;
    else scoreBuckets['0-49']++;
  }

  console.log(`  Score Distribution:`);
  for (const [range, count] of Object.entries(scoreBuckets)) {
    const bar = '█'.repeat(count);
    console.log(`    ${range}: ${bar} (${count})`);
  }
  
  const avgScore = posts.reduce((sum, p) => sum + (p.factScore || 0), 0) / posts.length;
  console.log(`\n  Average Fact Score: ${avgScore.toFixed(1)}`);
  console.log(`  ${avgScore >= 50 && avgScore <= 85 ? '✅ PASS' : '⚠️ CHECK'}: Scores feel calibrated (not all 85+ or all below 50)`);

  // ─── TEST 3: CONTENT QUALITY AUDIT ───
  console.log('\n\n═══════════════════════════════════════');
  console.log('TEST 3: CONTENT QUALITY AUDIT');
  console.log('═══════════════════════════════════════\n');

  let headlinePass = 0, headlineFail = 0;
  let bodyPass = 0, bodyFail = 0;
  const headlineFailExamples: string[] = [];
  const bodyFailExamples: string[] = [];

  for (const post of posts) {
    const h = post.headline || '';
    
    // Headline checks
    const hasRedditTags = /\[.*?\]/.test(h);
    const hasHTMLEntities = /&amp;|&lt;|&gt;/.test(h);
    const tooLong = h.split(/\s+/).length > 20;
    
    if (hasRedditTags || hasHTMLEntities || tooLong) {
      headlineFail++;
      headlineFailExamples.push(h.substring(0, 80));
    } else {
      headlinePass++;
    }

    // Body checks
    const body = post.body || post.description || '';
    const hasScraperJunk = body.includes('Article URL') || body.includes('Comments URL') || body.includes('[View Poll]');
    const wordCount = body.split(/\s+/).length;
    const paragraphs = body.split('\n\n').filter((p: string) => p.trim().length > 0);
    
    if (hasScraperJunk || wordCount < 60) {
      bodyFail++;
      bodyFailExamples.push(`"${h.substring(0, 50)}..." (${wordCount} words, ${paragraphs.length} paragraphs)`);
    } else {
      bodyPass++;
    }
  }

  console.log(`  HEADLINE QUALITY:`);
  console.log(`    Pass: ${headlinePass}/${posts.length}`);
  console.log(`    Fail: ${headlineFail}/${posts.length}`);
  if (headlineFailExamples.length > 0) {
    console.log(`    Fail examples:`);
    headlineFailExamples.slice(0, 3).forEach(e => console.log(`      ❌ "${e}"`));
  }
  console.log(`    ${headlineFail === 0 ? '✅ PASS' : '❌ FAIL'}: Headline sanitization`);

  console.log(`\n  BODY QUALITY:`);
  console.log(`    Pass: ${bodyPass}/${posts.length}`);
  console.log(`    Fail: ${bodyFail}/${posts.length}`);
  if (bodyFailExamples.length > 0) {
    console.log(`    Fail examples:`);
    bodyFailExamples.slice(0, 3).forEach(e => console.log(`      ❌ ${e}`));
  }
  console.log(`    ${bodyFail <= 2 ? '✅ PASS' : '❌ FAIL'}: Body quality`);

  // ─── TEST 4: CATEGORY ACCURACY ───
  console.log('\n\n═══════════════════════════════════════');
  console.log('TEST 4: CATEGORY ACCURACY');
  console.log('═══════════════════════════════════════\n');

  const categoryMap = new Map<string, number>();
  const indianPoliticsPosts: any[] = [];
  
  for (const post of posts) {
    const cat = post.category || 'Unknown';
    categoryMap.set(cat, (categoryMap.get(cat) || 0) + 1);
    
    if (cat === 'Indian Politics') {
      indianPoliticsPosts.push(post);
    }
  }

  console.log(`  Category Distribution:`);
  for (const [cat, count] of [...categoryMap.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`    ${cat}: ${count}`);
  }

  if (indianPoliticsPosts.length > 0) {
    console.log(`\n  INDIAN POLITICS AUDIT (${indianPoliticsPosts.length} posts):`);
    let indianPolluted = 0;
    for (const p of indianPoliticsPosts) {
      const h = (p.headline || '').toLowerCase();
      const isActuallyIndian = h.includes('india') || h.includes('modi') || h.includes('bjp') || 
        h.includes('congress') || h.includes('delhi') || h.includes('mumbai') || h.includes('upi') ||
        h.includes('isro') || h.includes('rupee');
      const isGlobalPollution = h.includes('trump') || h.includes('biden') || h.includes('ukraine') || 
        h.includes('china') || h.includes('putin') || h.includes('nato');
      
      if (isGlobalPollution) {
        console.log(`    ❌ POLLUTION: "${p.headline}"`);
        indianPolluted++;
      } else if (isActuallyIndian) {
        console.log(`    ✅ CORRECT: "${p.headline}"`);
      } else {
        console.log(`    ⚠️ UNCLEAR: "${p.headline}"`);
      }
    }
    console.log(`    ${indianPolluted === 0 ? '✅ PASS' : '❌ FAIL'}: Indian Politics accuracy`);
  }

  // ─── TEST 5: MEDIA EXPERIENCE ───
  console.log('\n\n═══════════════════════════════════════');
  console.log('TEST 5: MEDIA EXPERIENCE');
  console.log('═══════════════════════════════════════\n');

  let withImage = 0, withVideo = 0, noMedia = 0;
  for (const post of posts) {
    if (post.videoUrl) withVideo++;
    else if (post.imageUrl) withImage++;
    else noMedia++;
  }

  const mediaRate = ((withImage + withVideo) / posts.length * 100).toFixed(0);
  console.log(`  Posts with images: ${withImage}`);
  console.log(`  Posts with videos: ${withVideo}`);
  console.log(`  Posts without media: ${noMedia}`);
  console.log(`  Media coverage: ${mediaRate}%`);
  console.log(`  ${Number(mediaRate) >= 50 ? '✅ PASS' : '❌ FAIL'}: Media coverage (${mediaRate}% have visuals)`);

  // ─── FINAL SUMMARY ───
  console.log('\n\n═══════════════════════════════════════');
  console.log('PHASE 4.5 FINAL REPORT');
  console.log('═══════════════════════════════════════\n');

  console.log(`  Total posts audited: ${posts.length}`);
  console.log(`  AI Reasoning: ${(reasoningPassRate * 100).toFixed(0)}% contextual`);
  console.log(`  Average Score: ${avgScore.toFixed(1)}`);
  console.log(`  Headlines Clean: ${headlinePass}/${posts.length}`);
  console.log(`  Bodies Quality: ${bodyPass}/${posts.length}`);
  console.log(`  Media Coverage: ${mediaRate}%`);
  console.log(`  Categories: ${categoryMap.size} unique`);

  process.exit(0);
}

runQA().catch(e => { console.error(e); process.exit(1); });
