import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get('secret') !== 'lettr_qa_phase4') {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();

  const posts = await Post.find({ isPublished: true }).sort({ createdAt: -1 }).limit(30).lean();

  const GENERIC_PHRASES = [
    'automated assessment', 'appears mostly factual', 'based on current events',
    'internal system error', 'demo safe mode', 'analysis complete', 'no summary provided',
  ];

  const results = {
    totalPosts: posts.length,
    aiReasoning: { specific: 0, generic: 0, error: 0, missing: 0, examples: [] as any[] },
    scores: { '90-100': 0, '75-89': 0, '50-74': 0, '0-49': 0, average: 0 },
    headlines: { pass: 0, fail: 0, failExamples: [] as string[] },
    bodies: { pass: 0, fail: 0, failExamples: [] as string[] },
    categories: {} as Record<string, number>,
    indianPolitics: { total: 0, correct: 0, polluted: 0, examples: [] as any[] },
    media: { withImage: 0, withVideo: 0, noMedia: 0, coveragePercent: 0 },
    detailedPosts: [] as any[],
  };

  let totalScore = 0;

  for (const post of posts) {
    const summary = (post.factSummary || '').toLowerCase();
    const headline = post.headline || '';
    const body = post.body || post.description || '';
    const score = post.factScore || 0;
    totalScore += score;

    // AI Reasoning
    if (!post.factSummary || post.factSummary.length < 20) {
      results.aiReasoning.missing++;
    } else if (GENERIC_PHRASES.some(p => summary.includes(p))) {
      results.aiReasoning.generic++;
    } else if (summary.includes('error') || summary.includes('failed')) {
      results.aiReasoning.error++;
    } else {
      results.aiReasoning.specific++;
    }

    // Scores
    if (score >= 90) results.scores['90-100']++;
    else if (score >= 75) results.scores['75-89']++;
    else if (score >= 50) results.scores['50-74']++;
    else results.scores['0-49']++;

    // Headlines
    const hasRedditTags = /\[.*?\]/.test(headline);
    const hasHTMLEntities = /&amp;|&lt;|&gt;/.test(headline);
    if (hasRedditTags || hasHTMLEntities) {
      results.headlines.fail++;
      results.headlines.failExamples.push(headline.substring(0, 80));
    } else {
      results.headlines.pass++;
    }

    // Bodies
    const hasJunk = body.includes('Article URL') || body.includes('Comments URL');
    const wordCount = body.split(/\s+/).length;
    if (hasJunk || wordCount < 60) {
      results.bodies.fail++;
      results.bodies.failExamples.push(`"${headline.substring(0, 50)}" (${wordCount}w)`);
    } else {
      results.bodies.pass++;
    }

    // Categories
    const cat = post.category || 'Unknown';
    results.categories[cat] = (results.categories[cat] || 0) + 1;

    if (cat === 'Indian Politics') {
      results.indianPolitics.total++;
      const h = headline.toLowerCase();
      const isPolluted = h.includes('trump') || h.includes('biden') || h.includes('ukraine') || h.includes('putin');
      if (isPolluted) {
        results.indianPolitics.polluted++;
        results.indianPolitics.examples.push({ headline, status: 'POLLUTED' });
      } else {
        results.indianPolitics.correct++;
        results.indianPolitics.examples.push({ headline, status: 'CORRECT' });
      }
    }

    // Media
    if (post.videoUrl) results.media.withVideo++;
    else if (post.imageUrl) results.media.withImage++;
    else results.media.noMedia++;

    // Detailed post data (first 10)
    if (results.detailedPosts.length < 10) {
      results.detailedPosts.push({
        headline: headline.substring(0, 100),
        category: cat,
        factScore: score,
        confidence: post.confidence,
        reasoningPreview: (post.factSummary || '').substring(0, 200),
        hasImage: !!post.imageUrl,
        hasVideo: !!post.videoUrl,
        bodyWords: wordCount,
        createdAt: post.createdAt,
      });
    }

    // Top reasoning examples
    if (post.factSummary && post.factSummary.length > 80 && 
        !GENERIC_PHRASES.some(g => summary.includes(g)) &&
        results.aiReasoning.examples.length < 5) {
      results.aiReasoning.examples.push({
        headline: headline.substring(0, 80),
        score,
        reasoning: post.factSummary,
      });
    }
  }

  results.scores.average = Math.round(totalScore / posts.length);
  results.media.coveragePercent = Math.round(((results.media.withImage + results.media.withVideo) / posts.length) * 100);

  return NextResponse.json(results, { status: 200 });
}
