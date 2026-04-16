import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyFact } from '@/lib/ai-verification';
import { Post } from '@/models/Post';
import { User } from '@/models/User';

export async function POST(request: Request) {
  await dbConnect();

  try {
    const body = await request.json();
    const { headline, description, sourceLink, authorEmail } = body;

    if (!headline || !description) {
      return NextResponse.json({ error: 'Headline and description are required.' }, { status: 400 });
    }

    // Find the author
    const author = await User.findOne({ email: authorEmail || 'anonymous@lettr.ai' });
    
    if (!author) {
      return NextResponse.json({ error: 'User not found. Please sign in.' }, { status: 401 });
    }

    // Check verified author status
    if (!author.isVerifiedAuthor && author.role !== 'AUTHOR') {
      return NextResponse.json({ 
        error: 'Not authorized to publish. Only verified authors can submit articles.',
        requiresVerification: true
      }, { status: 403 });
    }

    // AI Fact Verification
    const verification = await verifyFact(headline, description, sourceLink);

    if (verification.factScore < 45) {
      return NextResponse.json({ 
        rejected: true,
        factScore: verification.factScore,
        reasoning: verification.reasoning,
        message: 'Content rejected: Fact score below threshold (45).'
      }, { status: 200 });
    }

    const newPost = await Post.create({
      authorId: author._id,
      headline,
      description,
      sourceLink: sourceLink || undefined,
      originSource: 'User Submitted',
      category: body.category || 'World',
      factScore: verification.factScore,
      reasoning: verification.reasoning,
      isPublished: true,
      engagement: 0
    });

    // Increment author post count
    await User.findByIdAndUpdate(author._id, { $inc: { totalPosts: 1 } });

    return NextResponse.json({ 
      success: true, 
      factScore: verification.factScore,
      reasoning: verification.reasoning,
      post: { _id: newPost._id.toString() }
    }, { status: 201 });

  } catch (error: any) {
    console.error('Publish Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
