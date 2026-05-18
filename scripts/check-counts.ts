import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function check() {
  console.log("Connecting to database for category counts...");
  try {
    const dbConnect = (await import('../lib/mongodb')).default;
    const { Post } = await import('../models/Post');

    await dbConnect();
    console.log("Connected successfully!");

    const counts = await Post.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    console.log("\n=== POST COUNTS BY CATEGORY ===");
    console.log(JSON.stringify(counts, null, 2));

  } catch (error) {
    console.error("Aggregation query failed:", error);
  } finally {
    process.exit(0);
  }
}

check();
