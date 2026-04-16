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

    // Find or create the author
    let author = await User.findOne({ email: authorEmail || 'anonymous@lettr.ai' });
    if (!author) {
      author = await User.create({
        name: 'Anonymous',
        email: 'anonymous@lettr.ai',
        role: 'READER'
      });
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
      factScore: verification.factScore,
      reasoning: verification.reasoning,
      isPublished: true,
      engagement: 0
    });

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
