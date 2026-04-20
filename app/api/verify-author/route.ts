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

    if (!headline || !body) {
      return NextResponse.json({ error: 'Headline and Body are required' }, { status: 400 });
    }

    // Use centralized verification library
    const verification = await verifyFact(headline, body, sources, { imageUrl, videoUrl });

    let isVerified = false;

    if (verification.factScore >= 85) {
      isVerified = true;
      await dbConnect();
      await User.findOneAndUpdate(
        { email: session.user.email },
        { 
          isVerifiedAuthor: true,
          role: 'AUTHOR'
        }
      );
    }

    return NextResponse.json({
      score: verification.factScore,
      summary: verification.factSummary,
      confidence: verification.confidence,
      sourcesChecked: verification.sourcesChecked,
      isVerified
    });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
