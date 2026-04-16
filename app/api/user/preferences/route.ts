import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';

// Save user preferences
export async function POST(request: Request) {
  await dbConnect();
  try {
    const { email, preferences } = await request.json();
    if (!email || !preferences) {
      return NextResponse.json({ error: 'email and preferences required' }, { status: 400 });
    }
    // Upsert — create user if not exists
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { preferences }, $setOnInsert: { name: email.split('@')[0], role: 'READER', isVerifiedAuthor: false, trustScore: 0 } },
      { new: true, upsert: true }
    );
    return NextResponse.json({ success: true, preferences: user.preferences });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Get user preferences
export async function GET(request: Request) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
    const user = await User.findOne({ email }).select('preferences likedPosts viewedPosts').lean();
    if (!user) return NextResponse.json({ preferences: [], likedPosts: [], viewedPosts: [] });
    return NextResponse.json({
      preferences: user.preferences || [],
      likedPosts: (user.likedPosts || []).map((id: any) => id.toString()),
      viewedPosts: (user.viewedPosts || []).map((id: any) => id.toString()),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
