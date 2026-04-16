import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Post } from '@/models/Post';

export async function POST(request: Request) {
  await dbConnect();
  try {
    const { email, postId, action } = await request.json();
    if (!email || !postId || !action) {
      return NextResponse.json({ error: 'email, postId, action required' }, { status: 400 });
    }

    // Upsert user on interaction
    const userUpdate: any = {};
    if (action === 'like') {
      userUpdate.$addToSet = { likedPosts: postId };
      await Post.findByIdAndUpdate(postId, { $inc: { engagement: 1 } });
    } else if (action === 'unlike') {
      userUpdate.$pull = { likedPosts: postId };
      await Post.findByIdAndUpdate(postId, { $inc: { engagement: -1 } });
    } else if (action === 'view') {
      userUpdate.$addToSet = { viewedPosts: postId };
    }

    await User.findOneAndUpdate(
      { email },
      { ...userUpdate, $setOnInsert: { name: email.split('@')[0], role: 'READER', isVerifiedAuthor: false, trustScore: 0 } },
      { upsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
