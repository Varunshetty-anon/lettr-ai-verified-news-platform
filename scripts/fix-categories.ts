import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CATEGORY_MAP: Record<string, string> = {
  'generative ai': 'AI & Tech',
  'tech india': 'Indian Tech',
  'indian economy': 'Indian Business',
  'startup india': 'Indian Startups',
  'startups india': 'Indian Startups',
  'global politics': 'Geopolitics',
  'us politics': 'World',
  'indian politics': 'Indian Politics',
  'science': 'Science',
  'crypto': 'Crypto',
  'energy': 'Climate',
};

async function fixCategories() {
  console.log("Connecting to database for migration...");
  try {
    const dbConnect = (await import('../lib/mongodb')).default;
    const { Post } = await import('../models/Post');

    await dbConnect();
    console.log("Database connected successfully. Running migration...");
    
    const posts = await Post.find({}).select('_id category').lean();
    let fixed = 0;
    
    for (const post of posts) {
      const lower = post?.category?.toLowerCase().trim();
      if (!lower) continue;
      const canonical = CATEGORY_MAP[lower];
      if (canonical && canonical !== post.category) {
        await Post.updateOne({ _id: post._id }, { $set: { category: canonical } });
        fixed++;
      }
    }
    console.log(`Successfully migrated and fixed ${fixed} posts with non-canonical categories.`);
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    process.exit(0);
  }
}

fixCategories();
