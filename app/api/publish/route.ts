import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { verifyFact } from '@/lib/ai-verification';
import { Post } from '@/models/Post';
import { User } from '@/models/User';
import { auth } from '@/auth';

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export async function POST(request: Request) {
  await dbConnect();

  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { headline, body, sourceLink, imageUrl, videoUrl, category } = await request.json();

    if (!headline || !body || !sourceLink) {
      return NextResponse.json({ error: 'Headline, article body, and source links are required.' }, { status: 400 });
    }

    if (wordCount(headline) > 15) {
      return NextResponse.json({ error: 'Headline must be 15 words or fewer.' }, { status: 400 });
    }

    // Find the author
    const author = await User.findOne({ email: session.user.email });
    
    if (!author) {
      return NextResponse.json({ error: 'User not found.' }, { status: 401 });
    }

    // Check verified author status
    if (!author.isVerifiedAuthor && author.role !== 'AUTHOR') {
      return NextResponse.json({ 
        error: 'Author verification required to publish.',
        requiresVerification: true
      }, { status: 403 });
    }

    // AI Fact Verification
    const verification = await verifyFact(headline, body, sourceLink, { imageUrl, videoUrl });

    if (verification.factScore < 45) {
      return NextResponse.json({ 
        rejected: true,
        factScore: verification.factScore,
        factSummary: verification.factSummary,
        message: 'Content rejected: Fact score below threshold (45).'
      }, { status: 200 });
    }

    // Strip URLs from body text to prevent messy formatting
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const cleanBody = body.replace(urlRegex, '').trim();

    const newPost = await Post.create({
      authorId: author._id,
      headline,
      description: cleanBody.substring(0, 200), // Summary for feed
      body: cleanBody,
      sourceLink,
      originSource: 'User Submitted',
      category: category || 'General',
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl || undefined,
      factScore: verification.factScore,
      factSummary: verification.factSummary,
      confidence: verification.confidence,
      sourcesChecked: verification.sourcesChecked,
      issues: verification.issues || [],
      isPublished: true,
      engagement: 0
    });

    // Increment author post count
    await User.findByIdAndUpdate(author._id, { $inc: { totalPosts: 1 } });

    return NextResponse.json({ 
      success: true, 
      factScore: verification.factScore,
      factSummary: verification.factSummary,
      confidence: verification.confidence,
      post: { _id: newPost._id.toString() }
    }, { status: 201 });

  } catch (error: unknown) {
    console.error('Publish Error:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
