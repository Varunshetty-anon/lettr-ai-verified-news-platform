import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';

export async function GET() {
  await dbConnect();
  try {
    const categories = await Post.distinct('category', { isPublished: true });
    // Filter out any empty or null categories
    const validCategories = categories.filter(c => c && typeof c === 'string' && c.trim().length > 0);
    return NextResponse.json({ categories: validCategories });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
