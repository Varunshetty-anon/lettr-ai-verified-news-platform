import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';
import { User } from '@/models/User';
import { getVerifiedBots } from '@/lib/bot-system';
import { verifyFact } from '@/lib/ai-verification';
import { hashUrl } from '@/lib/url-hash';
import { processRawContent } from '@/lib/content-processor';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import { getVerifiedBots } from '@/lib/bot-profiles';
import { verifyFact } from '@/lib/ai-verification';
import { Post } from '@/models/Post';
import { User } from '@/models/User';
import { uploadMediaFromUrl } from '@/lib/supabase';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Map bots to their respective sources and categories (matching user preference categories)
const BOT_CONFIG: Record<string, { sources: string[]; category: string }> = {
  'TechNews Bot': {
    sources: ['https://www.reddit.com/r/technology/hot.json?limit=15', 'https://www.reddit.com/r/developersIndia/hot.json?limit=15'],
    category: 'AI & Tech'
  },
  'GlobalPolitics Bot': {
    sources: ['https://www.reddit.com/r/geopolitics/hot.json?limit=15', 'https://www.reddit.com/r/IndianPolitics/hot.json?limit=15'],
    category: 'Geopolitics'
  },
  'Finance Bot': {
    sources: ['https://www.reddit.com/r/economics/hot.json?limit=15', 'https://www.reddit.com/r/IndianStreetBets/hot.json?limit=15'],
    category: 'Finance'
  },
  'AI Insider Bot': {
    sources: ['https://www.reddit.com/r/artificial/hot.json?limit=15', 'https://www.reddit.com/r/MachineLearning/hot.json?limit=15'],
    category: 'AI & Tech'
  },
  'WorldNews Bot': {
    sources: ['https://www.reddit.com/r/worldnews/hot.json?limit=15', 'https://www.reddit.com/r/IndiaNews/hot.json?limit=15'],
    category: 'Geopolitics'
  },
  'Science Bot': {
    sources: ['https://www.reddit.com/r/science/hot.json?limit=15', 'https://www.reddit.com/r/EverythingScience/hot.json?limit=15'],
    category: 'Science'
  },
  'Crypto Bot': {
    sources: ['https://www.reddit.com/r/CryptoCurrency/hot.json?limit=15', 'https://www.reddit.com/r/Bitcoin/hot.json?limit=15'],
    category: 'Crypto'
  },
  'Space Bot': {
    sources: ['https://www.reddit.com/r/space/hot.json?limit=15', 'https://www.reddit.com/r/spacex/hot.json?limit=15'],
    category: 'Space'
  },
  'Health Bot': {
    sources: ['https://www.reddit.com/r/Health/hot.json?limit=15', 'https://www.reddit.com/r/medicine/hot.json?limit=15'],
    category: 'Health'
  },
  'Energy Bot': {
    sources: ['https://www.reddit.com/r/energy/hot.json?limit=15', 'https://www.reddit.com/r/RenewableEnergy/hot.json?limit=15'],
    category: 'Energy'
  },
  'Defense Bot': {
    sources: ['https://www.reddit.com/r/defense/hot.json?limit=15', 'https://www.reddit.com/r/Military/hot.json?limit=15'],
    category: 'Geopolitics'
  },
  'Startup Bot': {
    sources: ['https://www.reddit.com/r/startups/hot.json?limit=15', 'https://www.reddit.com/r/StartUpIndia/hot.json?limit=15'],
    category: 'Indian Startups'
  },
};

const RSS_FALLBACKS: Record<string, string[]> = {
  'TechNews Bot': ['https://hnrss.org/frontpage', 'https://feeds.feedburner.com/TechCrunch/'],
  'GlobalPolitics Bot': ['https://www.reutersagency.com/feed/', 'https://www.aljazeera.com/xml/rss/all.xml'],
  'Finance Bot': ['https://search.cnbc.com/rs/search/view.xml?partnerId=2000&keywords=finance', 'https://www.moneycontrol.com/rss/latestnews.xml'],
  'AI Insider Bot': ['https://hnrss.org/frontpage?q=AI', 'https://feeds.feedburner.com/TechCrunch/'],
  'WorldNews Bot': ['https://www.reutersagency.com/feed/', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'],
  'Science Bot': ['https://www.nasa.gov/rss/dyn/breaking_news.rss', 'https://hnrss.org/frontpage?q=science'],
  'Crypto Bot': ['https://cointelegraph.com/rss', 'https://hnrss.org/frontpage?q=crypto'],
  'Space Bot': ['https://www.nasa.gov/rss/dyn/breaking_news.rss', 'https://hnrss.org/frontpage?q=space'],
  'Health Bot': ['https://hnrss.org/frontpage?q=health', 'https://www.reutersagency.com/feed/'],
  'Energy Bot': ['https://hnrss.org/frontpage?q=energy', 'https://www.reutersagency.com/feed/'],
  'Defense Bot': ['https://hnrss.org/frontpage?q=defense', 'https://www.reutersagency.com/feed/'],
  'Startup Bot': ['https://hnrss.org/frontpage?q=startup', 'https://feeds.feedburner.com/TechCrunch/'],
};

const CANONICAL_CATEGORIES = [
  'AI & Tech', 'World', 'Finance', 'Space', 'Health', 'Culture',
  'Indian Politics', 'Indian Tech', 'Indian Startups', 'Indian Business',
  'Indian Science', 'Indian Sports', 'Indian Entertainment',
  'Geopolitics', 'Science', 'Crypto', 'Energy', 'Climate'
];

function normalizeCategory(rawCategory: string): string {
  if (!rawCategory) return 'World';
  
  const lower = rawCategory.toLowerCase().trim();
  
  // Direct match first
  const directMatch = CANONICAL_CATEGORIES.find(
    c => c.toLowerCase() === lower
  );
  if (directMatch) return directMatch;
  
  // Fuzzy keyword matching
  if (lower.includes('ai') || lower.includes('tech') || lower.includes('artificial')) return 'AI & Tech';
  if (lower.includes('indian') && lower.includes('tech')) return 'Indian Tech';
  if (lower.includes('indian') && lower.includes('start')) return 'Indian Startups';
  if (lower.includes('indian') && lower.includes('polit')) return 'Indian Politics';
  if (lower.includes('indian') && lower.includes('biz') || lower.includes('indian') && lower.includes('business')) return 'Indian Business';
  if (lower.includes('indian') && lower.includes('sport')) return 'Indian Sports';
  if (lower.includes('indian') && lower.includes('entertain')) return 'Indian Entertainment';
  if (lower.includes('india')) return 'Indian Tech';
  if (lower.includes('space') || lower.includes('nasa') || lower.includes('rocket') || lower.includes('astro')) return 'Space';
  if (lower.includes('health') || lower.includes('medical') || lower.includes('medicine') || lower.includes('disease')) return 'Health';
  if (lower.includes('finance') || lower.includes('market') || lower.includes('stock') || lower.includes('economy')) return 'Finance';
  if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('blockchain')) return 'Crypto';
  if (lower.includes('climate') || lower.includes('environment') || lower.includes('energy') || lower.includes('solar')) return 'Climate';
  if (lower.includes('science') || lower.includes('research') || lower.includes('study')) return 'Science';
  if (lower.includes('geopolit') || lower.includes('war') || lower.includes('conflict') || lower.includes('military')) return 'Geopolitics';
  if (lower.includes('culture') || lower.includes('art') || lower.includes('music') || lower.includes('film')) return 'Culture';
  if (lower.includes('world') || lower.includes('global') || lower.includes('international')) return 'World';
  
  // Default fallback
  return 'World';
}

function sanitizeEditorialContent(text: string): string {
  if (!text) return '';
  return text
    .replace(/https?:\/\/\S+/gi, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/Article URL:\s*\S*/gi, '')
    .replace(/Comments URL:\s*\S*/gi, '')
    .replace(/Points:\s*\d+/gi, '')
    .replace(/\d+\s*Comments?:?/gi, '')
    .replace(/Link posted:.*$/gim, '')
    .replace(/Source:.*$/gim, '')
    .replace(/Submitted by\s*\S*/gi, '')
    .replace(/[\*\_#`~>+\-\=]/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim();
}

function sanitizeEditorialBody(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map(para => sanitizeEditorialContent(para))
    .filter(para => para.trim().length > 0)
    .join('\n\n');
}

function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

function extractMediaFromReddit(data: any): { image?: string; video?: string } {
  if (data.is_video && data.media?.reddit_video?.fallback_url) {
    return { video: data.media.reddit_video.fallback_url };
  }
  if (data.preview?.reddit_video_preview?.fallback_url) {
    return { video: data.preview.reddit_video_preview.fallback_url };
  }
  if (data.secure_media?.reddit_video?.fallback_url) {
    return { video: data.secure_media.reddit_video.fallback_url };
  }
  if (data.url && /\.(mp4|webm|mov)(\?.*)?$/i.test(data.url)) {
    return { video: data.url };
  }
  if (data.url && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(data.url)) {
    return { image: data.url };
  }
  if (data.preview?.images?.[0]?.source?.url) {
    const imgUrl = data.preview.images[0].source.url.replace(/&amp;/g, '&');
    return { image: imgUrl };
  }
  if (data.thumbnail && data.thumbnail.startsWith('http') && data.thumbnail !== 'self' && data.thumbnail !== 'default' && data.thumbnail !== 'nsfw') {
    return { image: data.thumbnail };
  }
  return {};
}

export async function GET(request: Request) {
  await dbConnect();
  
  try {
    const activeBots = await getVerifiedBots();
    
    // Auto-prioritize categories with low counts (< 20)
    const categoryCounts = await Post.aggregate([
      { $match: { isPublished: true } },
      { $group: { _id: "$category", count: { $sum: 1 } } }
    ]);
    const categoryCountMap = new Map(categoryCounts.map(c => [c._id, c.count]));
    const MINIMUM_COUNT = 20;
    
    let randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
    const starvedBots = activeBots.filter(bot => {
      const cat = BOT_CONFIG[bot.name]?.category || 'World';
      const count = categoryCountMap.get(cat) || 0;
      return count < MINIMUM_COUNT;
    });
    
    if (starvedBots.length > 0) {
      starvedBots.sort((a, b) => {
        const catA = BOT_CONFIG[a.name]?.category || 'World';
        const catB = BOT_CONFIG[b.name]?.category || 'World';
        return (categoryCountMap.get(catA) || 0) - (categoryCountMap.get(catB) || 0);
      });
      randomBot = starvedBots[0];
      console.log(`[Cron] Prioritizing starved category for bot: ${randomBot.name}`);
    }

    const config = BOT_CONFIG[randomBot.name] || BOT_CONFIG['WorldNews Bot'];
    const sourceUrl = config.sources[Math.floor(Math.random() * config.sources.length)];

    interface CandidateArticle {
      title: string;
      text: string;
      link: string;
      originTag: string;
      media: any;
    }
    const candidates: CandidateArticle[] = [];

    try {
      const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'LettrBot/1.0' } });
      if (!response.ok) throw new Error(`Reddit API failed with status ${response.status}`);
      const redditData = await response.json();
      const posts = redditData.data?.children;
      if (!posts || posts.length === 0) throw new Error("No Reddit data");

      const shuffled = posts.sort(() => Math.random() - 0.5);
      for (const post of shuffled) {
        const urlHash = hashUrl(post.data.url);
        const existing = await Post.findOne({ sourceHash: urlHash });
        if (!existing) {
          candidates.push({
            title: post.data.title,
            text: post.data.selftext || `Link posted: ${post.data.url}`,
            link: post.data.url,
            originTag: `Source: Reddit (r/${post.data.subreddit})`,
            media: extractMediaFromReddit(post.data)
          });
          if (candidates.length >= 6) break;
        }
      }
    } catch (redditError: any) {
      console.log(`[Cron] Reddit fetch failed or no posts available, falling back to RSS:`, redditError.message);
      const rssList = RSS_FALLBACKS[randomBot.name] || RSS_FALLBACKS['WorldNews Bot'];
      const rssUrl = rssList[Math.floor(Math.random() * rssList.length)];
      console.log(`[Cron] Fetching RSS fallback from: ${rssUrl}`);
      const rssRes = await fetch(rssUrl, { headers: { 'User-Agent': 'LettrBot/1.0' } });
      if (!rssRes.ok) throw new Error(`RSS fallback failed with status ${rssRes.status}`);
      const rssText = await rssRes.text();
      const items = rssText.split('<item>').slice(1);
      if (items.length === 0) throw new Error("No items in RSS feed");

      const shuffledItems = items.sort(() => Math.random() - 0.5);
      for (const item of shuffledItems) {
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const link = linkMatch ? linkMatch[1].trim() : '';
        if (link) {
          const urlHash = hashUrl(link);
          const existing = await Post.findOne({ sourceHash: urlHash });
          if (!existing) {
            const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
            const descMatch = item.match(/<description>([\s\S]*?)<\/description>/);
            const rawTitle = titleMatch ? titleMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim() : 'Breaking News';
            const rawText = descMatch ? descMatch[1].replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, '').trim() : '';
            const originalLink = link.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').trim();
            const originTag = `Source: RSS Feed (${new URL(rssUrl).hostname})`;
            
            const media: any = {};
            const imgMatch = item.match(/<media:content[^>]*url="([^"]+)"/) || item.match(/<enclosure[^>]*url="([^"]+)"/) || item.match(/<img[^>]*src="([^"]+)"/);
            if (imgMatch) {
              media.image = imgMatch[1];
            }

            candidates.push({
              title: rawTitle,
              text: rawText,
              link: originalLink,
              originTag,
              media
            });
            if (candidates.length >= 6) break;
          }
        }
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ message: "No new candidate content found." }, { status: 200 });
    }

    let postsCreated = 0;
    const MAX_POSTS_PER_RUN = 3;
    const seeded: any[] = [];

    for (const candidate of candidates) {
      if (postsCreated >= MAX_POSTS_PER_RUN) break;

      try {
        const rawTitle = candidate.title;
        const rawText = candidate.text;
        const originalLink = candidate.link;
        const originTag = candidate.originTag;
        const media = candidate.media;
        const urlHash = hashUrl(originalLink);

        let imageUrl = undefined;
        let videoUrl = undefined;

        if (media.image) {
          const filename = `bot-img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
          const uploaded = await uploadMediaFromUrl(media.image, filename);
          imageUrl = uploaded || media.image;
        }
        if (media.video) {
          videoUrl = media.video;
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("Missing GROQ API Key");

        const processed = await processRawContent(rawTitle, rawText, config.category);
        
        if (!processed) {
          console.log(`[Cron] Skip post: rejected by content processor (low quality or LLM failure)`);
          continue;
        }

        const paragraphs = processed.body.split('\n\n').filter(p => p.trim().length > 0);
        const description = paragraphs[0] || processed.body.substring(0, 200);

        // Fact verification
        const verification = await verifyFact(processed.headline, processed.body, originalLink);
        if (verification.factScore < 45) {
          console.log(`[Cron] Skip post: failed AI Fact check (Score: ${verification.factScore})`);
          continue;
        }

        const normalizedCategory = normalizeCategory(processed.category || config.category);

        const newPost = await Post.create({
          authorId: randomBot._id,
          headline: processed.headline,
          description: description,
          body: processed.body,
          sourceLink: originalLink,
          sourceHash: urlHash,
          originSource: originTag,
          category: normalizedCategory,
          imageUrl,
          videoUrl,
          factScore: verification.factScore,
          factSummary: verification.factSummary,
          confidence: verification.confidence,
          sourcesChecked: verification.sourcesChecked,
          issues: verification.issues || [],
          isPublished: true,
          engagement: Math.floor(Math.random() * 80) + 5
        });

        await User.findByIdAndUpdate(randomBot._id, { $inc: { totalPosts: 1 } });

        postsCreated++;
        const totalInCategory = await Post.countDocuments({ category: normalizedCategory });
        console.log(`[Bot] Posted to category: ${normalizedCategory} | Total posts in category: ${totalInCategory}`);
        
        seeded.push({
          bot: randomBot.name,
          category: normalizedCategory,
          totalInCategory,
          headline: newPost.headline
        });

      } catch (err: any) {
        console.error(`[Cron] Failed processing candidate:`, err.message);
        continue;
      }
    }

    return NextResponse.json({ success: true, seeded }, { status: 201 });

  } catch (error: unknown) {
    console.error("Bot Engine Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
