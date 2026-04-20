import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { Post } from '@/models/Post';
import mongoose from 'mongoose';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();
  
  try {
    const { id: authorId } = await params;
    
    if (!mongoose.Types.ObjectId.isValid(authorId)) {
      return NextResponse.json({ error: 'Invalid Author ID' }, { status: 400 });
    }

    const author = await User.findById(authorId).select('name image trustScore followersCount isVerifiedAuthor role createdAt').lean();
    if (!author) {
      return NextResponse.json({ error: 'Author not found' }, { status: 404 });
    }

    // Fetch author posts
    const posts = await Post.find({ authorId: new mongoose.Types.ObjectId(authorId), isPublished: true })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Calculate average fact score
    const totalScore = posts.reduce((acc, p) => acc + (p.factScore || 0), 0);
    const avgScore = posts.length > 0 ? Math.round(totalScore / posts.length) : 0;

    return NextResponse.json({
      author: {
        ...author,
        _id: (author._id as any).toString(),
        avgScore
      },
      posts: posts.map(p => ({
        ...p,
        _id: (p._id as any).toString()
      }))
    });

  } catch (error: any) {
    console.error("Author Fetch Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
