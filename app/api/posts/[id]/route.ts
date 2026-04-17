import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';
import { User } from '@/models/User';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await dbConnect();

  try {
    const { id } = await params;
    const post = await Post.findById(id).lean();
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const author = await User.findById(post.authorId).lean();

    // Find related posts in same category
    const related = await Post.find({
      _id: { $ne: post._id },
      category: post.category,
      isPublished: true
    })
      .sort({ factScore: -1 })
      .limit(3)
      .lean();

    const relatedHydrated = await Promise.all(related.map(async (r) => {
      const rAuthor = await User.findById(r.authorId).lean();
      return {
        _id: (r._id as any).toString(),
        headline: r.headline,
        factScore: r.factScore,
        category: r.category,
        createdAt: r.createdAt,
        author: rAuthor ? { name: rAuthor.name } : null,
      };
    }));

    return NextResponse.json({
      post: {
        _id: (post._id as any).toString(),
        headline: post.headline,
        description: post.description,
        body: post.body || '',
        factScore: post.factScore,
        reasoning: post.reasoning,
        originSource: post.originSource,
        category: post.category,
        sourceLink: post.sourceLink,
        mediaUrl: post.mediaUrl,
        mediaType: post.mediaType || 'text',
        engagement: post.engagement,
        createdAt: post.createdAt,
        author: author ? {
          _id: (author._id as any).toString(),
          name: author.name,
          image: author.image,
          trustScore: author.trustScore,
          role: author.role,
          totalPosts: author.totalPosts,
          isVerifiedAuthor: author.isVerifiedAuthor,
        } : null,
      },
      related: relatedHydrated,
    }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
