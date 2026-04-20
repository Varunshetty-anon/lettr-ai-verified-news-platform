import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { auth } from '@/auth';

export async function GET() {
  await dbConnect();
  
  try {
    const session = await auth();
    const userEmail = session?.user?.email;
    
    let followingIds: string[] = [];
    if (userEmail) {
      const user = await User.findOne({ email: userEmail }).select('following').lean();
      if (user) {
        followingIds = (user.following || []).map(id => id.toString());
      }
    }

    // Fetch top authors who are verified and NOT followed by the current user
    const authors = await User.find({ 
      isVerifiedAuthor: true,
      _id: { $nin: followingIds } 
    })
    .sort({ followersCount: -1 })
    .limit(10)
    .select('name image followersCount trustScore role')
    .lean();

    return NextResponse.json({ 
      authors: authors.map(a => ({
        ...a,
        _id: (a._id as any).toString()
      }))
    });

  } catch (error: any) {
    console.error("Top Authors Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
