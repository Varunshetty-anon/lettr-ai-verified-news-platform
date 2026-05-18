import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import { Post } from '@/models/Post';
import { User } from '@/models/User';
import { getVerifiedBots } from '@/lib/bot-profiles';
import { verifyFact, isVerificationCoolingDown } from '@/lib/ai-verification';
import { hashUrl } from '@/lib/url-hash';
import { processRawContent, isContentProcessorCoolingDown } from '@/lib/content-processor';
import { uploadMediaFromUrl } from '@/lib/supabase';
import { fetchOGImage } from '@/lib/og-image';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ─── Bot Configuration ─────────────────────────────────────────
const BOT_CONFIG: Record<string, { sources: string[]; category: string }> = {
  'TechNews Bot': {
    sources: ['https://www.reddit.com/r/technology/hot.json?limit=12', 'https://www.reddit.com/r/developersIndia/hot.json?limit=12'],
    category: 'AI & Tech'
  },
  'GlobalPolitics Bot': {
    sources: ['https://www.reddit.com/r/geopolitics/hot.json?limit=12', 'https://www.reddit.com/r/IndianPolitics/hot.json?limit=12'],
    category: 'Geopolitics'
  },
  'Finance Bot': {
    sources: ['https://www.reddit.com/r/economics/hot.json?limit=12', 'https://www.reddit.com/r/IndianStreetBets/hot.json?limit=12'],
    category: 'Finance'
  },
  'AI Insider Bot': {
    sources: ['https://www.reddit.com/r/artificial/hot.json?limit=12', 'https://www.reddit.com/r/MachineLearning/hot.json?limit=12'],
    category: 'AI & Tech'
  },
  'WorldNews Bot': {
    sources: ['https://www.reddit.com/r/worldnews/hot.json?limit=12', 'https://www.reddit.com/r/IndiaNews/hot.json?limit=12'],
    category: 'Geopolitics'
  },
  'Science Bot': {
    sources: ['https://www.reddit.com/r/science/hot.json?limit=12', 'https://www.reddit.com/r/EverythingScience/hot.json?limit=12'],
    category: 'Science'
  },
  'Crypto Bot': {
    sources: ['https://www.reddit.com/r/CryptoCurrency/hot.json?limit=12', 'https://www.reddit.com/r/Bitcoin/hot.json?limit=12'],
    category: 'Crypto'
  },
  'Space Bot': {
    sources: ['https://www.reddit.com/r/space/hot.json?limit=12', 'https://www.reddit.com/r/spacex/hot.json?limit=12'],
    category: 'Space'
  },
  'Health Bot': {
    sources: ['https://www.reddit.com/r/Health/hot.json?limit=12', 'https://www.reddit.com/r/medicine/hot.json?limit=12'],
    category: 'Health'
  },
  'Energy Bot': {
    sources: ['https://www.reddit.com/r/energy/hot.json?limit=12', 'https://www.reddit.com/r/RenewableEnergy/hot.json?limit=12'],
    category: 'Energy'
  },
  'Defense Bot': {
    sources: ['https://www.reddit.com/r/defense/hot.json?limit=12', 'https://www.reddit.com/r/Military/hot.json?limit=12'],
    category: 'Geopolitics'
  },
  'Startup Bot': {
    sources: ['https://www.reddit.com/r/startups/hot.json?limit=12', 'https://www.reddit.com/r/StartUpIndia/hot.json?limit=12'],
    category: 'Indian Startups'
  },
};

// ─── RSS Fallbacks ─────────────────────────────────────────────
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

// ─── Canonical Categories ──────────────────────────────────────
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
  const directMatch = CANONICAL_CATEGORIES.find(c => c.toLowerCase() === lower);
  if (directMatch) return directMatch;

  // ─── Catch common LLM drift patterns ───
  // "Tech India" / "India Tech" → "Indian Tech"
  if ((lower.includes('tech') && lower.includes('india')) || lower === 'tech india' || lower === 'india tech') return 'Indian Tech';
  // "Startups India" / "India Startups" → "Indian Startups"
  if ((lower.includes('startup') && lower.includes('india')) || lower === 'startups india' || lower === 'india startups') return 'Indian Startups';
  // "Game AI" / "Gaming" → "AI & Tech"
  if (lower.includes('game') || lower.includes('gaming')) return 'AI & Tech';
  // "Defense" / "Defence" / "Military" → "Geopolitics"
  if (lower.includes('defense') || lower.includes('defence') || lower.includes('military')) return 'Geopolitics';
  // "Economy" / "Business" without India → "Finance"
  if (lower === 'economy' || lower === 'business' || lower === 'markets') return 'Finance';
  // "Indian Economy" / "India Economy"
  if (lower.includes('india') && (lower.includes('economy') || lower.includes('econom'))) return 'Finance';
  // "Entertainment" without India → "Culture"
  if (lower === 'entertainment' || lower === 'media' || lower === 'movies') return 'Culture';
  // "Politics" without India → "World"
  if (lower === 'politics' || lower === 'us politics' || lower === 'american politics') return 'World';

  // ─── Standard fuzzy matching ───
  if (lower.includes('indian') && lower.includes('tech')) return 'Indian Tech';
  if (lower.includes('indian') && lower.includes('start')) return 'Indian Startups';
  if (lower.includes('indian') && lower.includes('polit')) return 'Indian Politics';
  if ((lower.includes('indian') && lower.includes('biz')) || (lower.includes('indian') && lower.includes('business'))) return 'Indian Business';
  if (lower.includes('indian') && lower.includes('sport')) return 'Indian Sports';
  if (lower.includes('indian') && lower.includes('entertain')) return 'Indian Entertainment';
  if (lower.includes('india') && !lower.includes('tech') && !lower.includes('start') && !lower.includes('polit')) return 'Indian Tech';
  if (lower.includes('ai') || lower.includes('tech') || lower.includes('artificial') || lower.includes('software') || lower.includes('robot')) return 'AI & Tech';
  if (lower.includes('space') || lower.includes('nasa') || lower.includes('rocket') || lower.includes('astro')) return 'Space';
  if (lower.includes('health') || lower.includes('medical') || lower.includes('medicine') || lower.includes('disease')) return 'Health';
  if (lower.includes('finance') || lower.includes('market') || lower.includes('stock') || lower.includes('economy')) return 'Finance';
  if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('blockchain')) return 'Crypto';
  if (lower.includes('climate') || lower.includes('environment') || lower.includes('energy') || lower.includes('solar')) return 'Climate';
  if (lower.includes('science') || lower.includes('research') || lower.includes('study')) return 'Science';
  if (lower.includes('geopolit') || lower.includes('war') || lower.includes('conflict')) return 'Geopolitics';
  if (lower.includes('culture') || lower.includes('art') || lower.includes('music') || lower.includes('film')) return 'Culture';
  if (lower.includes('world') || lower.includes('global') || lower.includes('international')) return 'World';
  if (lower.includes('sport') || lower.includes('cricket') || lower.includes('football')) return 'Indian Sports';

  return 'World';
}

// ─── Media Extraction (prioritized) ────────────────────────────
function extractMediaFromReddit(data: any): { image?: string; video?: string } {
  // Priority 1: Reddit native video
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

  // Priority 2: Direct image URL (article hero image)
  if (data.url && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(data.url)) {
    return { image: data.url };
  }

  // Priority 3: Preview image (OG image equivalent)
  if (data.preview?.images?.[0]?.source?.url) {
    const imgUrl = data.preview.images[0].source.url.replace(/&amp;/g, '&');
    // Skip tiny thumbnails — only accept reasonable resolution
    const width = data.preview.images[0].source.width || 0;
    if (width >= 300) {
      return { image: imgUrl };
    }
  }

  // Priority 4: Thumbnail (last resort, must be decent)
  if (data.thumbnail && data.thumbnail.startsWith('http') && 
      !['self', 'default', 'nsfw', 'spoiler', 'image'].includes(data.thumbnail)) {
    return { image: data.thumbnail };
  }

  return {};
}

// ─── Reddit Pre-Filter (reject non-news) ───────────────────────
function isRedditPostNewsworthy(post: any): boolean {
  const data = post.data;
  
  // Reject pinned/stickied
  if (data.stickied) return false;
  
  // Reject extremely low engagement (likely noise)
  if (data.score < 10) return false;
  
  // Reject image-only posts without meaningful text
  if (data.is_gallery && (!data.selftext || data.selftext.length < 30)) return false;
  
  // Reject posts that are just links to images with no context
  if (data.post_hint === 'image' && (!data.selftext || data.selftext.length < 30)) return false;
  
  // Reject NSFW
  if (data.over_18) return false;
  
  // Title minimum — single word titles are junk
  if (data.title.split(/\s+/).length < 4) return false;
  
  return true;
}

// ═══════════════════════════════════════════════════════════════
//  MAIN CRON HANDLER
// ═══════════════════════════════════════════════════════════════
export async function GET(request: Request) {
  await dbConnect();

  try {
    // ── Rate limit check: if AI is cooling down, reduce activity ──
    if (isContentProcessorCoolingDown() || isVerificationCoolingDown()) {
      console.log('[Cron] AI services in cooldown. Reducing to 1 post max this run.');
    }
    const maxPostsThisRun = (isContentProcessorCoolingDown() || isVerificationCoolingDown()) ? 1 : 2;

    const activeBots = await getVerifiedBots();

    // Auto-prioritize categories with low counts
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
      media: { image?: string; video?: string };
    }
    const candidates: CandidateArticle[] = [];

    // ── Fetch candidates from Reddit ──
    try {
      const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'LettrBot/1.0' } });
      if (!response.ok) throw new Error(`Reddit API failed with status ${response.status}`);
      const redditData = await response.json();
      const posts = redditData.data?.children;
      if (!posts || posts.length === 0) throw new Error("No Reddit data");

      const shuffled = posts.sort(() => Math.random() - 0.5);
      for (const post of shuffled) {
        // Pre-filter: skip non-newsworthy Reddit posts
        if (!isRedditPostNewsworthy(post)) continue;

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
          if (candidates.length >= 5) break;
        }
      }
    } catch (redditError: any) {
      console.log(`[Cron] Reddit fetch failed, falling back to RSS:`, redditError.message);
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

            const media: { image?: string; video?: string } = {};
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
            if (candidates.length >= 5) break;
          }
        }
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json({ message: "No new candidate content found." }, { status: 200 });
    }

    // ── Sort candidates: prefer ones WITH media for top-row quality ──
    candidates.sort((a, b) => {
      const aMedia = (a.media.image || a.media.video) ? 1 : 0;
      const bMedia = (b.media.image || b.media.video) ? 1 : 0;
      return bMedia - aMedia;
    });

    let postsCreated = 0;
    const seeded: any[] = [];

    for (const candidate of candidates) {
      if (postsCreated >= maxPostsThisRun) break;

      try {
        const rawTitle = candidate.title;
        const rawText = candidate.text;
        const originalLink = candidate.link;
        const originTag = candidate.originTag;
        const media = candidate.media;
        const urlHash = hashUrl(originalLink);

        let imageUrl: string | undefined;
        let videoUrl: string | undefined;

        // ── Media upload with fallback ──
        if (media.image) {
          const filename = `bot-img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
          const uploaded = await uploadMediaFromUrl(media.image, filename);
          imageUrl = uploaded || media.image;
        }
        if (media.video) {
          videoUrl = media.video;
        }

        // ── OG Image fallback: if no media from source, try fetching from the link ──
        if (!imageUrl && !videoUrl && originalLink) {
          console.log(`[Cron] No inline media. Trying OG image from: ${originalLink.substring(0, 60)}...`);
          const ogImage = await fetchOGImage(originalLink);
          if (ogImage) {
            const filename = `og-img-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.jpg`;
            const uploaded = await uploadMediaFromUrl(ogImage, filename);
            imageUrl = uploaded || ogImage;
            console.log(`[Cron] OG image found and saved.`);
          }
        }

        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) throw new Error("Missing GROQ API Key");

        // ── Content Processing (cheap model) ──
        console.log(`[Cron] Processing: "${rawTitle.substring(0, 60)}..."`);
        const processed = await processRawContent(rawTitle, rawText, config.category);

        if (!processed) {
          console.log(`[Cron] Skip: rejected by content processor`);
          continue;
        }

        const paragraphs = processed.body.split('\n\n').filter(p => p.trim().length > 0);
        const description = paragraphs[0] || processed.body.substring(0, 200);

        // ── Fact Verification (premium model) ──
        console.log(`[Cron] Verifying: "${processed.headline.substring(0, 60)}..."`);
        const verification = await verifyFact(processed.headline, processed.body, originalLink);

        if (verification.factScore < 40) {
          console.log(`[Cron] Skip: failed fact check (Score: ${verification.factScore})`);
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
        console.log(`[Bot] Posted: "${newPost.headline}" | Category: ${normalizedCategory} | Total: ${totalInCategory}`);

        seeded.push({
          bot: randomBot.name,
          category: normalizedCategory,
          totalInCategory,
          headline: newPost.headline,
          factScore: verification.factScore
        });

        // ── Inter-post delay to avoid flooding Groq ──
        if (postsCreated < maxPostsThisRun) {
          await new Promise(r => setTimeout(r, 2000));
        }

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
