import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';
import { User } from '@/models/User';

export async function GET(req: NextRequest) {
  await dbConnect();
  const q = req.nextUrl.searchParams.get('q');
  if (!q || q.length < 2) return NextResponse.json({ posts: [], authors: [] });

  const regex = new RegExp(q, 'i');

  const [posts, authors] = await Promise.all([
    Post.find({
      $or: [{ headline: regex }, { summary: regex }, { category: regex }],
      factScore: { $gt: 0 }
    }).limit(8).select('headline category factScore imageUrl _id').lean(),
    User.find({
      $or: [{ name: regex }],
      role: { $in: ['AUTHOR', 'BOT'] }
    }).limit(5).select('name image role followersCount _id').lean()
  ]);

  return NextResponse.json({ posts, authors });
}
