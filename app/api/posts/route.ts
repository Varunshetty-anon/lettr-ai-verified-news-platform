import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';
import { User } from '@/models/User';

export async function GET(request: Request) {
  await dbConnect();

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const sort = searchParams.get('sort') || 'recent';
    const email = searchParams.get('email');

    const filter: any = { isPublished: true };
    if (category) filter.category = category;

    let userPrefs: string[] = [];
    let userLikes: string[] = [];

    // Fetch user data for personalization
    if (email) {
      const user = await User.findOne({ email }).select('preferences likedPosts viewedPosts').lean();
      if (user) {
        userPrefs = user.preferences || [];
        userLikes = (user.likedPosts || []).map((id: any) => id.toString());
      }
    }

    const sortObj: Record<string, -1> = sort === 'score' ? { factScore: -1 } : { createdAt: -1 };

    const posts = await Post.find(filter)
      .sort(sortObj)
      .limit(50)
      .lean();

    // Hydrate author info
    const authorIds = [...new Set(posts.map(p => p.authorId?.toString()))];
    const authors = await User.find({ _id: { $in: authorIds } }).lean();
    const authorMap = new Map(authors.map(a => [(a._id as any).toString(), a]));

    let hydrated = posts.map(post => {
      const author = authorMap.get(post.authorId?.toString());
      return {
        _id: (post._id as any).toString(),
        headline: post.headline,
        description: post.description,
        factScore: post.factScore,
        reasoning: post.reasoning,
        originSource: post.originSource,
        sourceLink: post.sourceLink,
        category: post.category,
        mediaUrl: post.mediaUrl,
        engagement: post.engagement,
        createdAt: post.createdAt,
        isLiked: userLikes.includes((post._id as any).toString()),
        author: author ? {
          name: author.name,
          trustScore: author.trustScore,
          role: author.role,
          isVerifiedAuthor: author.isVerifiedAuthor,
        } : null,
      };
    });

    // Personalized ranking if user has preferences and no explicit category filter
    if (userPrefs.length > 0 && !category && sort === 'recent') {
      hydrated.sort((a, b) => {
        const aBoost = userPrefs.includes(a.category || '') ? 20 : 0;
        const bBoost = userPrefs.includes(b.category || '') ? 20 : 0;
        const aLikeBoost = a.isLiked ? 5 : 0;
        const bLikeBoost = b.isLiked ? 5 : 0;
        const aScore = aBoost + aLikeBoost + (a.factScore / 10) + (new Date(a.createdAt).getTime() / 1e12);
        const bScore = bBoost + bLikeBoost + (b.factScore / 10) + (new Date(b.createdAt).getTime() / 1e12);
        return bScore - aScore;
      });
    }

    return NextResponse.json({ posts: hydrated.slice(0, 30) }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
