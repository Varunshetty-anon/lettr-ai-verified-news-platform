import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';
import { verifyFact } from '@/lib/ai-verification';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { headline, body, sources, imageUrl, videoUrl } = await req.json();

    if (!headline || !body || !sources) {
      return NextResponse.json({ error: 'Headline, body, and source links are required' }, { status: 400 });
    }

    // Use centralized verification library
    const verification = await verifyFact(headline, body, sources, { imageUrl, videoUrl }, true);

    let isVerified = false;

    if (verification.factScore >= 85) {
      isVerified = true;
      await dbConnect();
      await User.findOneAndUpdate(
        { email: session.user.email },
        { 
          $set: {
            isVerifiedAuthor: true,
            role: 'AUTHOR',
          },
          $setOnInsert: {
            name: session.user.name || session.user.email.split('@')[0],
            email: session.user.email,
            image: session.user.image || '',
            preferences: [],
            categoryAffinity: {},
            trustScore: verification.factScore,
          },
        },
        { upsert: true, new: true }
      );
    }

    return NextResponse.json({
      score: verification.factScore,
      summary: verification.factSummary,
      confidence: verification.confidence,
      sourcesChecked: verification.sourcesChecked,
      isVerified
    });

  } catch (error: unknown) {
    console.error("Verification Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage || 'Internal Server Error' }, { status: 500 });
  }
}
