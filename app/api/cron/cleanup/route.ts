import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';

export async function GET(request: Request) {
  try {
    // Basic auth check using a hardcoded secret in query param for security
    const { searchParams } = new URL(request.url);
    if (searchParams.get('secret') !== 'lettr_cleanup_999') {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    console.log('[Cleanup API] Connected to MongoDB.');

    const allPosts = await Post.find({ isPublished: true });
    let deletedCount = 0;

    for (const post of allPosts) {
      let isBad = false;

      const headline = post.headline || '';
      const bodyText = post.body || post.description || '';
      const factSummary = post.factSummary || '';

      if (/\[.*?\]/g.test(headline) || /&amp;|&lt;|&gt;/.test(headline)) {
        isBad = true;
      }

      if (bodyText.includes('Article URL') || bodyText.includes('Comments URL') || bodyText.includes('[View Poll]')) {
        isBad = true;
      }

      const wordCount = bodyText.split(/\s+/).length;
      if (wordCount < 60) {
        isBad = true;
      }

      if (factSummary.includes('internal error') || factSummary.includes('Internal System Error')) {
        isBad = true;
      }

      if (isBad) {
        await Post.findByIdAndDelete(post._id);
        deletedCount++;
      }
    }

    return NextResponse.json({ success: true, deletedCount }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
