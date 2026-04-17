import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  await dbConnect();

  const user = await User.findOne({ email: session.user.email })
    .populate({
      path: 'likedPosts',
      select: '_id headline category createdAt factScore',
      options: { sort: { createdAt: -1 }, limit: 20 }
    })
    .populate({
      path: 'viewedPosts',
      select: '_id headline category createdAt factScore',
      options: { sort: { createdAt: -1 }, limit: 30 }
    })
    .select('name email image role isVerifiedAuthor preferences categoryAffinity trustScore totalPosts')
    .lean();

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({
    user: {
      id: (user._id as any).toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role,
      isVerifiedAuthor: user.isVerifiedAuthor,
      preferences: user.preferences || [],
      likedPosts: user.likedPosts || [],
      viewedPosts: user.viewedPosts || [],
      categoryAffinity: user.categoryAffinity || {},
      trustScore: user.trustScore,
      totalPosts: user.totalPosts,
    }
  });
}
