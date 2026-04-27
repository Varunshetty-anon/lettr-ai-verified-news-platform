import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';
import { User } from '@/models/User';
import { auth } from '@/auth';

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
    let userViewed: string[] = [];
    let userImpressed: string[] = [];
    let userFollowing: string[] = [];
    let categoryAffinity: Record<string, number> = {};

    // Try to get user from session or email param
    let userEmail = email;
    if (!userEmail) {
      const session = await auth();
      userEmail = session?.user?.email || null;
    }

    // Fetch user data for personalization
    if (userEmail) {
      const user = await User.findOne({ email: userEmail })
        .select('preferences likedPosts viewedPosts impressedPosts categoryAffinity following')
        .lean();
      if (user) {
        userPrefs = user.preferences || [];
        userLikes = (user.likedPosts || []).map((id: any) => id.toString());
        userViewed = (user.viewedPosts || []).map((id: any) => id.toString());
        userImpressed = (user.impressedPosts || []).map((id: any) => id.toString());
        userFollowing = (user.following || []).map((id: any) => id.toString());
        categoryAffinity = (user.categoryAffinity as any) || {};
        
        // Exclude viewed and liked posts from the database query to guarantee fresh content
        const hiddenIds = [
          ...(user.viewedPosts || []),
          ...(user.impressedPosts || [])
        ].map((id: any) => new mongoose.Types.ObjectId(id));
        
        if (hiddenIds.length > 0) {
          filter._id = { $nin: hiddenIds };
        }

        // Convert Map to plain object if needed
        if (categoryAffinity instanceof Map) {
          categoryAffinity = Object.fromEntries(categoryAffinity);
        }
      }
    }

    const sortObj: Record<string, -1> = sort === 'score' ? { factScore: -1 } : { createdAt: -1 };

    const posts = await Post.find(filter)
      .sort(sortObj)
      .limit(100)
      .lean();

    // Hydrate author info
    const authorIds = [...new Set(posts.map(p => p.authorId?.toString()))];
    const authors = await User.find({ _id: { $in: authorIds } }).lean();
    const authorMap = new Map(authors.map(a => [(a._id as any).toString(), a]));

    // Get liked categories from user's liked posts
    const likedCategorySet = new Set<string>();
    if (userLikes.length > 0) {
      const likedPosts = await Post.find({ _id: { $in: userLikes } }).select('category').lean();
      likedPosts.forEach(p => { if (p.category) likedCategorySet.add(p.category); });
    }

    // Get viewed categories
    const viewedCategorySet = new Set<string>();
    if (userViewed.length > 0 && userViewed.length <= 100) {
      const viewedPosts = await Post.find({ _id: { $in: userViewed.slice(-50) } }).select('category').lean();
      viewedPosts.forEach(p => { if (p.category) viewedCategorySet.add(p.category); });
    }

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
        mediaType: post.mediaType || 'text',
        imageUrl: post.imageUrl,
        videoUrl: post.videoUrl,
        engagement: post.engagement,
        createdAt: post.createdAt,
        isLiked: userLikes.includes((post._id as any).toString()),
        author: author ? {
          _id: (author._id as any).toString(),
          name: author.name,
          trustScore: author.trustScore,
          role: author.role,
          isVerifiedAuthor: author.isVerifiedAuthor,
        } : null,
        authorId: post.authorId?.toString(),
        followBoost: 0,
        factSummary: post.factSummary,
        confidence: post.confidence,
        sourcesChecked: post.sourcesChecked,
      };
    });

    if (userFollowing.length > 0) {
      hydrated.forEach((p: any) => {
        if (userFollowing.includes(p.authorId)) {
          p.followBoost = 30;
        }
      });
    }

    // Personalized ranking: preferences*5 + likedCategoryMatch*4 + viewedCategoryMatch*3 + factScore*2 + recency
    if (userPrefs.length > 0 && !category && sort === 'recent') {
      const now = Date.now();
      hydrated.sort((a, b) => {
        const aCategory = a.category || '';
        const bCategory = b.category || '';

        // Preference match (5 points)
        const aPref = userPrefs.includes(aCategory) ? 5 : 0;
        const bPref = userPrefs.includes(bCategory) ? 5 : 0;

        // Liked category match (4 points)
        const aLikeCat = likedCategorySet.has(aCategory) ? 4 : 0;
        const bLikeCat = likedCategorySet.has(bCategory) ? 4 : 0;

        // Viewed/clicked category match (3 points)
        const aViewCat = viewedCategorySet.has(aCategory) ? 3 : 0;
        const bViewCat = viewedCategorySet.has(bCategory) ? 3 : 0;

        // Category affinity boost
        const aAffinity = (categoryAffinity[aCategory] || 0) * 0.5;
        const bAffinity = (categoryAffinity[bCategory] || 0) * 0.5;

        // Fact score (2 points, normalized)
        const aFact = (a.factScore / 100) * 2;
        const bFact = (b.factScore / 100) * 2;

        // Recency (0-10 points, based on how recent, heavily skewed to last 24h)
        const aRecency = Math.max(0, 10 * (1 - (now - new Date(a.createdAt).getTime()) / (3 * 24 * 60 * 60 * 1000)));
        const bRecency = Math.max(0, 10 * (1 - (now - new Date(b.createdAt).getTime()) / (3 * 24 * 60 * 60 * 1000)));

        const aScore = aPref + aLikeCat + aViewCat + aAffinity + aFact + aRecency + (a.followBoost || 0);
        const bScore = bPref + bLikeCat + bViewCat + bAffinity + bFact + bRecency + (b.followBoost || 0);

        return bScore - aScore;
      });
    }

    return NextResponse.json({ posts: hydrated }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
