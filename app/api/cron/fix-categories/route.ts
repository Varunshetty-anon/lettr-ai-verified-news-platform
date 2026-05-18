import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';

export const dynamic = 'force-dynamic';

// Canonical category list
const CANONICAL_CATEGORIES = [
  'AI & Tech', 'World', 'Finance', 'Space', 'Health', 'Culture',
  'Indian Politics', 'Indian Tech', 'Indian Startups', 'Indian Business',
  'Indian Science', 'Indian Sports', 'Indian Entertainment',
  'Geopolitics', 'Science', 'Crypto', 'Energy', 'Climate'
];

function normalizeCategory(rawCategory: string, headline: string): string {
  if (!rawCategory) return 'World';
  const lower = rawCategory.toLowerCase().trim();
  const headlineLower = (headline || '').toLowerCase();

  // Direct match
  if (CANONICAL_CATEGORIES.map(c => c.toLowerCase()).includes(lower)) {
    // Even if direct match, check if Indian content miscategorized as Geopolitics
    if (lower === 'geopolitics' && isIndianContent(headlineLower)) {
      return detectIndianCategory(headlineLower);
    }
    return CANONICAL_CATEGORIES.find(c => c.toLowerCase() === lower)!;
  }

  // Non-canonical → canonical mapping
  const MAPPINGS: Record<string, string> = {
    'tech india': 'Indian Tech',
    'india tech': 'Indian Tech',
    'startups india': 'Indian Startups',
    'india startups': 'Indian Startups',
    'game ai': 'AI & Tech',
    'gaming': 'AI & Tech',
    'defense': 'Geopolitics',
    'defence': 'Geopolitics',
    'military': 'Geopolitics',
    'economy': 'Finance',
    'business': 'Finance',
    'markets': 'Finance',
    'entertainment': 'Culture',
    'media': 'Culture',
    'movies': 'Culture',
    'politics': 'World',
    'us politics': 'World',
    'american politics': 'World',
    'indian economy': 'Finance',
  };

  if (MAPPINGS[lower]) return MAPPINGS[lower];

  // Fuzzy
  if (lower.includes('india') && lower.includes('tech')) return 'Indian Tech';
  if (lower.includes('india') && lower.includes('start')) return 'Indian Startups';
  if (lower.includes('ai') || lower.includes('tech')) return 'AI & Tech';
  if (lower.includes('crypto') || lower.includes('bitcoin')) return 'Crypto';
  if (lower.includes('space') || lower.includes('nasa')) return 'Space';
  if (lower.includes('health') || lower.includes('medical')) return 'Health';
  if (lower.includes('science') || lower.includes('research')) return 'Science';
  if (lower.includes('climate') || lower.includes('energy')) return 'Climate';
  if (lower.includes('finance') || lower.includes('market')) return 'Finance';
  if (lower.includes('culture') || lower.includes('art') || lower.includes('film')) return 'Culture';
  if (lower.includes('geopolit') || lower.includes('war') || lower.includes('conflict')) return 'Geopolitics';

  return 'World';
}

function isIndianContent(headline: string): boolean {
  const INDIA_KEYWORDS = [
    'india', 'indian', 'delhi', 'mumbai', 'bangalore', 'bengaluru', 'chennai',
    'kolkata', 'hyderabad', 'pune', 'jaipur', 'ahmedabad', 'lucknow',
    'modi', 'bjp', 'congress', 'aap', 'nda', 'upa',
    'supreme court of india', 'isro', 'upi', 'rupee', 'nifty', 'sensex',
    'karnataka', 'uttar pradesh', 'maharashtra', 'tamil nadu', 'kerala',
    'rajasthan', 'gujarat', 'west bengal', 'bihar', 'madhya pradesh',
    'bhojshala', 'dubare', 'yogi', 'adityanath', 'cm of',
  ];
  return INDIA_KEYWORDS.some(kw => headline.includes(kw));
}

function detectIndianCategory(headline: string): string {
  if (headline.includes('election') || headline.includes('parliament') || 
      headline.includes('supreme court') || headline.includes('modi') || 
      headline.includes('bjp') || headline.includes('congress') ||
      headline.includes('cm ') || headline.includes('chief minister') ||
      headline.includes('governor') || headline.includes('law') ||
      headline.includes('policy') || headline.includes('yogi')) {
    return 'Indian Politics';
  }
  if (headline.includes('startup') || headline.includes('founder') || headline.includes('ipo')) {
    return 'Indian Startups';
  }
  if (headline.includes('isro') || headline.includes('tech') || headline.includes('ai')) {
    return 'Indian Tech';
  }
  if (headline.includes('cricket') || headline.includes('sports') || headline.includes('ipl')) {
    return 'Indian Sports';
  }
  if (headline.includes('bollywood') || headline.includes('puja') || headline.includes('festival') ||
      headline.includes('temple') || headline.includes('prayer')) {
    return 'Culture';
  }
  return 'Indian Politics'; // Default for Indian content
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== 'lettr_cleanup_999') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const posts = await Post.find({ isPublished: true });
  let fixed = 0;
  const changes: Array<{ headline: string; from: string; to: string }> = [];

  for (const post of posts) {
    const currentCategory = post.category || 'World';
    const newCategory = normalizeCategory(currentCategory, post.headline || '');

    if (newCategory !== currentCategory) {
      await Post.updateOne({ _id: post._id }, { $set: { category: newCategory } });
      fixed++;
      changes.push({
        headline: (post.headline || '').substring(0, 80),
        from: currentCategory,
        to: newCategory
      });
    }
  }

  return NextResponse.json({ 
    success: true, 
    totalChecked: posts.length,
    fixed,
    changes 
  }, { status: 200 });
}
