import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import mongoose from 'mongoose';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { authorId } = await req.json();
    if (!authorId) {
      return NextResponse.json({ error: 'Author ID is required' }, { status: 400 });
    }

    await dbConnect();
    
    const user = await User.findOne({ email: session.user.email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetAuthorId = new mongoose.Types.ObjectId(authorId);
    
    // Check if already following
    const isFollowing = user.following.some(id => id.equals(targetAuthorId));

    if (isFollowing) {
      // Unfollow
      await User.updateOne(
        { _id: user._id },
        { $pull: { following: targetAuthorId } }
      );
      await User.updateOne(
        { _id: targetAuthorId },
        { $inc: { followersCount: -1 } }
      );
    } else {
      // Follow
      await User.updateOne(
        { _id: user._id },
        { $addToSet: { following: targetAuthorId } }
      );
      await User.updateOne(
        { _id: targetAuthorId },
        { $inc: { followersCount: 1 } }
      );
    }

    return NextResponse.json({ 
      success: true, 
      isFollowing: !isFollowing 
    });

  } catch (error: any) {
    console.error("Follow Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
