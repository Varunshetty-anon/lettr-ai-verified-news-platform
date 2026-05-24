import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Post } from './models/Post.js';

dotenv.config({ path: '.env.local' });

async function checkBots() {
  await mongoose.connect(process.env.MONGODB_URI as string, { dbName: 'lettr' });
  const total = await Post.countDocuments();
  const withImage = await Post.countDocuments({ imageUrl: { $exists: true, $ne: null } });
  const withVideo = await Post.countDocuments({ videoUrl: { $exists: true, $ne: null } });
  console.log(`Total: ${total}, With Image: ${withImage}, With Video: ${withVideo}`);
  process.exit(0);
}

checkBots();
