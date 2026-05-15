import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';

// Save user preferences
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email;

  await dbConnect();
  try {
    const { preferences } = await request.json();
    if (!preferences) {
      return NextResponse.json({ error: 'preferences required' }, { status: 400 });
    }
    // Upsert — create user if not exists
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { preferences }, $setOnInsert: { name: email.split('@')[0], role: 'READER', isVerifiedAuthor: false, trustScore: 0 } },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, preferences: user.preferences });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// Get user preferences
export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const email = session.user.email;

  await dbConnect();
  try {
    const user = await User.findOne({ email }).select('preferences likedPosts viewedPosts').lean();
    if (!user) return NextResponse.json({ preferences: [], likedPosts: [], viewedPosts: [] });
    return NextResponse.json({
      preferences: user.preferences || [],
      likedPosts: (user.likedPosts || []).map((id: any) => id.toString()),
      viewedPosts: (user.viewedPosts || []).map((id: any) => id.toString()),
    });
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
