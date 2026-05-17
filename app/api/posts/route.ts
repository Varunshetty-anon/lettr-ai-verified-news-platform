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

    const filter: any = { isPublished: true };
    if (category) filter.category = category;

    let userPrefs: string[] = [];
    let userLikes: string[] = [];
    let userViewed: string[] = [];
    let userImpressed: string[] = [];
    let userFollowing: string[] = [];
    let categoryAffinity: Record<string, number> = {};

    // Strictly get user from session
    const session = await auth();
    const userEmail = session?.user?.email || null;

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

    const hydrated = posts.map(post => {
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
          email: author.email,
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
          p.followBoost = 50;
        }
      });
    }

    // Personalized ranking priority:
    // followed authors > explicit preferences > liked categories > clicked categories > fact score > recency.
    const isNewUser = !(userPrefs.length > 0 || userFollowing.length > 0 || userLikes.length > 0 || userViewed.length > 0);
    const now = Date.now();

    if (!category && sort === 'recent') {
      if (isNewUser) {
        // Sort purely by factScore DESC + recency so they still get good content
        hydrated.sort((a, b) => {
          const aFact = a.factScore || 0;
          const bFact = b.factScore || 0;

          const aAgeInHours = (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
          const aRecency = Math.max(0, 10 - (aAgeInHours / 24) * 2);

          const bAgeInHours = (now - new Date(b.createdAt).getTime()) / (1000 * 60 * 60);
          const bRecency = Math.max(0, 10 - (bAgeInHours / 24) * 2);

          const isBotA = a.author?.role?.toLowerCase() === 'bot' || a.author?.email?.includes('@lettr.ai') || a.author?.name?.toLowerCase().includes('bot');
          const isBotB = b.author?.role?.toLowerCase() === 'bot' || b.author?.email?.includes('@lettr.ai') || b.author?.name?.toLowerCase().includes('bot');
          const aBoost = isBotA ? 1.0 : 1.5;
          const bBoost = isBotB ? 1.0 : 1.5;

          const aScore = (aFact + aRecency * 5) * aBoost;
          const bScore = (bFact + bRecency * 5) * bBoost;
          return bScore - aScore;
        });
      } else {
        const adjacentMap: Record<string, string[]> = {
          'AI & Tech': ['Startups India', 'Finance', 'Space'],
          'Indian Politics': ['Indian Economy', 'Geopolitics'],
          'Indian Economy': ['Indian Politics', 'Startups India', 'Finance'],
          'Startups India': ['AI & Tech', 'Indian Economy', 'Finance'],
          'Geopolitics': ['Indian Politics', 'Indian Economy'],
          'Finance': ['Indian Economy', 'Startups India'],
          'Space': ['AI & Tech', 'Health'],
          'Health': ['Space', 'AI & Tech'],
          'Entertainment': ['Sports'],
          'Sports': ['Entertainment'],
        };

        const getAdjacents = (prefs: string[]) => {
          const adjs = new Set<string>();
          prefs.forEach(p => {
            const list = adjacentMap[p] || [];
            list.forEach(item => adjs.add(item));
          });
          return Array.from(adjs);
        };

        const userAdjacents = getAdjacents(userPrefs);

        hydrated.sort((a, b) => {
          const aCategory = a.category || '';
          const bCategory = b.category || '';

          const aFollow = a.followBoost || 0;
          const bFollow = b.followBoost || 0;

          const aPref = userPrefs.includes(aCategory) ? 1000 : 0;
          const bPref = userPrefs.includes(bCategory) ? 1000 : 0;

          const aAdj = userAdjacents.includes(aCategory) ? 300 : 0;
          const bAdj = userAdjacents.includes(bCategory) ? 300 : 0;

          const aLikeCat = likedCategorySet.has(aCategory) ? 20 : 0;
          const bLikeCat = likedCategorySet.has(bCategory) ? 20 : 0;

          const aViewCat = viewedCategorySet.has(aCategory) ? 12 : 0;
          const bViewCat = viewedCategorySet.has(bCategory) ? 12 : 0;

          // Category affinity boost
          const aAffinity = (categoryAffinity[aCategory] || 0) * 0.5;
          const bAffinity = (categoryAffinity[bCategory] || 0) * 0.5;

          const aFact = (a.factScore / 100) * 5;
          const bFact = (b.factScore / 100) * 5;

          const aAgeInHours = (now - new Date(a.createdAt).getTime()) / (1000 * 60 * 60);
          const aRecency = Math.max(0, 10 - (aAgeInHours / 24) * 2);

          const bAgeInHours = (now - new Date(b.createdAt).getTime()) / (1000 * 60 * 60);
          const bRecency = Math.max(0, 10 - (bAgeInHours / 24) * 2);

          const isBotA = a.author?.role?.toLowerCase() === 'bot' || a.author?.email?.includes('@lettr.ai') || a.author?.name?.toLowerCase().includes('bot');
          const isBotB = b.author?.role?.toLowerCase() === 'bot' || b.author?.email?.includes('@lettr.ai') || b.author?.name?.toLowerCase().includes('bot');
          const aBoost = isBotA ? 1.0 : 1.5;
          const bBoost = isBotB ? 1.0 : 1.5;

          const aScore = (aFollow + aPref + aAdj + aLikeCat + aViewCat + aAffinity + aFact + aRecency) * aBoost;
          const bScore = (bFollow + bPref + bAdj + bLikeCat + bViewCat + bAffinity + bFact + bRecency) * bBoost;

          return bScore - aScore;
        });
      }
    }

    // Category diversity: don't show same category more than 3 times in first 10 posts
    const categoryCounts: Record<string, number> = {};
    const diversifiedPosts = hydrated.reduce((acc, post) => {
      const cat = post.category || 'Uncategorized';
      const count = categoryCounts[cat] || 0;
      if (acc.length < 10 && count >= 3) return acc; // skip if same category appears 3+ times in top 10
      categoryCounts[cat] = count + 1;
      acc.push(post);
      return acc;
    }, [] as typeof hydrated);

    return NextResponse.json({ posts: diversifiedPosts }, { status: 200 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
