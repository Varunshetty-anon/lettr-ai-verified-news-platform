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

    // Fetch post to get its category for affinity tracking
    const post = await Post.findById(postId).select('category').lean();
    const postCategory = post?.category || '';

    const userUpdate: any = {};
    
    if (action === 'like') {
      userUpdate.$addToSet = { likedPosts: postId };
      await Post.findByIdAndUpdate(postId, { $inc: { engagement: 1 } });
      // Increment category affinity by 2 for likes
      if (postCategory) {
        userUpdate.$inc = { [`categoryAffinity.${postCategory}`]: 2 };
      }
    } else if (action === 'unlike') {
      userUpdate.$pull = { likedPosts: postId };
      await Post.findByIdAndUpdate(postId, { $inc: { engagement: -1 } });
      // Decrement category affinity by 1 for unlikes
      if (postCategory) {
        userUpdate.$inc = { [`categoryAffinity.${postCategory}`]: -1 };
      }
    } else if (action === 'view') {
      userUpdate.$addToSet = { viewedPosts: postId };
      // Increment category affinity by 1 for views
      if (postCategory) {
        userUpdate.$inc = { [`categoryAffinity.${postCategory}`]: 1 };
      }
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
