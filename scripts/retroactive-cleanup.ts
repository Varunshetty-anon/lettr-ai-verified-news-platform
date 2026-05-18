import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function runCleanup() {
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable inside .env.local');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB.');

  const Post = mongoose.models.Post || mongoose.model('Post', new mongoose.Schema({
    headline: String,
    description: String,
    body: String,
    factSummary: String,
    category: String,
    isPublished: Boolean
  }, { collection: 'posts' }));

  const allPosts = await Post.find({ isPublished: true });
  console.log(`Analyzing ${allPosts.length} published posts for retroactive cleanup...`);

  let deletedCount = 0;

  for (const post of allPosts) {
    let isBad = false;
    let reason = '';

    const headline = post.headline || '';
    const bodyText = post.body || post.description || '';
    const factSummary = post.factSummary || '';

    // 1. Raw Reddit tags or unescaped HTML in headline
    if (/\[.*?\]/g.test(headline) || /&amp;|&lt;|&gt;/.test(headline)) {
      isBad = true;
      reason = 'Headline contains raw tags or unescaped HTML';
    }

    // 2. Junk body / Scraper artifacts
    if (bodyText.includes('Article URL') || bodyText.includes('Comments URL') || bodyText.includes('[View Poll]')) {
      isBad = true;
      reason = 'Body contains raw scraper junk';
    }

    // 3. Truncated or too short
    const wordCount = bodyText.split(/\s+/).length;
    if (wordCount < 60) {
      isBad = true;
      reason = `Body too short (${wordCount} words)`;
    }

    // 4. Exposed internal errors in fact summary
    if (factSummary.includes('internal error') || factSummary.includes('Internal System Error')) {
      isBad = true;
      reason = 'Fact summary exposes internal error';
    }

    if (isBad) {
      console.log(`[DELETING] ${headline.substring(0, 50)}... -> Reason: ${reason}`);
      await Post.findByIdAndDelete(post._id);
      deletedCount++;
    }
  }

  console.log(`\nCleanup complete! Deleted ${deletedCount} low-quality posts.`);
  process.exit(0);
}

runCleanup().catch(console.error);
