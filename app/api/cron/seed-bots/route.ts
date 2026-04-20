import { NextResponse } from 'next/server';
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
    sources: ['https://www.reddit.com/r/technology/hot.json?limit=15', 'https://www.reddit.com/r/gadgets/hot.json?limit=15'],
    category: 'AI & Tech'
  },
  'GlobalPolitics Bot': {
    sources: ['https://www.reddit.com/r/geopolitics/hot.json?limit=15', 'https://www.reddit.com/r/worldnews/hot.json?limit=15'],
    category: 'Geopolitics'
  },
  'Finance Bot': {
    sources: ['https://www.reddit.com/r/economics/hot.json?limit=15', 'https://www.reddit.com/r/finance/hot.json?limit=15'],
    category: 'Finance'
  },
  'AI Insider Bot': {
    sources: ['https://www.reddit.com/r/artificial/hot.json?limit=15', 'https://www.reddit.com/r/MachineLearning/hot.json?limit=15'],
    category: 'AI & Tech'
  },
  'WorldNews Bot': {
    sources: ['https://www.reddit.com/r/worldnews/hot.json?limit=15', 'https://www.reddit.com/r/news/hot.json?limit=15'],
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
    category: 'Defense'
  },
  'Startup Bot': {
    sources: ['https://www.reddit.com/r/startups/hot.json?limit=15', 'https://www.reddit.com/r/Entrepreneur/hot.json?limit=15'],
    category: 'Startups'
  },
};

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
    const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
    const config = BOT_CONFIG[randomBot.name] || BOT_CONFIG['WorldNews Bot'];
    const sourceUrl = config.sources[Math.floor(Math.random() * config.sources.length)];

    const response = await fetch(sourceUrl, {
      headers: { 'User-Agent': 'LettrBot/1.0' }
    });
    const redditData = await response.json();
    const posts = redditData.data?.children;
    if (!posts || posts.length === 0) throw new Error("No Reddit data");

    // Try multiple posts to find one that hasn't been posted yet
    const shuffled = posts.sort(() => Math.random() - 0.5);
    let targetContent = null;

    for (const post of shuffled) {
      const urlHash = hashUrl(post.data.url);
      const existing = await Post.findOne({ sourceHash: urlHash });
      if (!existing) {
        targetContent = post.data;
        break;
      }
    }

    if (!targetContent) {
      return NextResponse.json({ message: "No new unique content found. All sources already posted." }, { status: 200 });
    }

    const rawTitle = targetContent.title;
    const rawText = targetContent.selftext || `Link posted: ${targetContent.url}`;
    const originalLink = targetContent.url;
    const originTag = `Source: Reddit (r/${targetContent.subreddit})`;
    const urlHash = hashUrl(originalLink);
    
    // Extract media
    const media = extractMediaFromReddit(targetContent);

    // 1. REWRITE VIA GROQ — FULL ARTICLE GENERATION
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ API Key");

    let rewriteContent = {
      cleanHeadline: rawTitle,
      cleanSummary: "Live news feed summary.",
      fullBody: "",
      sourceNote: "",
      dynamicCategory: config.category
    };

    try {
      const rewriteResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: `You are a senior news editor at a premium, fact-based news platform. Your writing is clear, authoritative, and detailed. You never use clickbait or sensational language. You write in a factual, analytical tone similar to Reuters or The Economist.`
            },
            {
              role: "user",
              content: `Rewrite the following raw content into a professional news article. Do NOT copy raw text verbatim. Write original, well-structured content. If the content implies a video or image, verify the facts in context of the described media.

Raw Title: ${rawTitle}
Raw Text: ${rawText.substring(0, 1200)}
Source URL: ${originalLink}
Bot Specialty: ${config.category}
Media Presence: ${media.video ? 'Contains Video' : media.image ? 'Contains Image' : 'Text Only'}

Return EXACTLY in this format (use the exact labels):

Headline: <A strong, clear, professional news headline. Max 15 words.>

Summary: <A comprehensive 5-8 line summary of the key facts. Cover who, what, when, where, why, and the significance. Each line should add new information.>

Article: <A detailed 3-5 paragraph article body. Include background context, expert analysis, implications, and what comes next. Write at least 250 words. Structure with clear paragraphs.>

Source Note: <A one-line credibility assessment of the source, e.g. "Sourced from r/technology, corroborated by multiple news outlets.">

Category: <Generate a highly specific, trending 1-3 word category based on the article content (e.g. "Generative AI", "Space Tourism", "US Elections"). Do NOT just use the bot specialty.>
            }
          ],
          temperature: 0.4,
          max_tokens: 1500
        })
      });

      if (rewriteResponse.ok) {
        const rewriteData = await rewriteResponse.json();
        const outputText = rewriteData.choices[0]?.message?.content || "";
        
        const headMatch = outputText.match(/Headline:\s*(.*)/i);
        const sumMatch = outputText.match(/Summary:\s*([\s\S]*?)(?=\nArticle:)/i);
        const bodyMatch = outputText.match(/Article:\s*([\s\S]*?)(?=\nSource Note:)/i);
        const sourceNoteMatch = outputText.match(/Source Note:\s*([\s\S]*?)(?=\nCategory:)/i) || outputText.match(/Source Note:\s*(.*)/i);
        const categoryMatch = outputText.match(/Category:\s*(.*)/i);
        
        if (headMatch) rewriteContent.cleanHeadline = headMatch[1].trim();
        if (sumMatch) rewriteContent.cleanSummary = sumMatch[1].trim();
        if (bodyMatch) rewriteContent.fullBody = bodyMatch[1].trim();
        if (sourceNoteMatch) rewriteContent.sourceNote = sourceNoteMatch[1].trim();
        if (categoryMatch) rewriteContent.dynamicCategory = categoryMatch[1].trim();
        
        // Fallback: if no body parsed but there's substantial text after summary
        if (!rewriteContent.fullBody && outputText.length > 200) {
          // Try to extract everything after Summary
          const afterSummary = outputText.split(/Summary:/i)[1] || '';
          const parts = afterSummary.split('\n\n');
          if (parts.length > 1) {
            rewriteContent.fullBody = parts.slice(1).join('\n\n').trim();
          }
        }
      }
    } catch (e) {
      console.error("Groq Rewrite Failed, using raw title.", e);
    }

    // Enforce minimum content length
    if (rewriteContent.cleanSummary.length < 50) {
      rewriteContent.cleanSummary = `${rawTitle}. ${rawText.substring(0, 300)}`;
    }

    // 2. FACT VERIFICATION
    const verification = await verifyFact(rewriteContent.cleanHeadline, rewriteContent.cleanSummary, originalLink);

    // 3. POST RULES ENFORCEMENT
    if (verification.factScore < 45) {
      return NextResponse.json({ message: "Content rejected by AI Fact rules.", factScore: verification.factScore }, { status: 200 });
    }

    // 4. Handle Media Upload
    let imageUrl = undefined;
    let videoUrl = undefined;
    
    if (media?.image) {
      const uploaded = await uploadMediaFromUrl(media.image, `bot-img-${Date.now()}.jpg`);
      imageUrl = uploaded || media.image;
    }
    if (media?.video) {
      videoUrl = media.video;
    }

    // 5. DB INJECTION
    const newPost = await Post.create({
      authorId: randomBot._id,
      headline: rewriteContent.cleanHeadline,
      description: rewriteContent.cleanSummary,
      body: rewriteContent.fullBody || rewriteContent.cleanSummary,
      sourceLink: originalLink,
      sourceHash: urlHash,
      originSource: rewriteContent.sourceNote || originTag,
      category: rewriteContent.dynamicCategory || config.category,
      imageUrl,
      videoUrl,
      factScore: verification.factScore,
      reasoning: verification.reasoning,
      isPublished: true,
      engagement: Math.floor(Math.random() * 80) + 5
    });

    // Update bot post count
    await User.findByIdAndUpdate(randomBot._id, { $inc: { totalPosts: 1 } });

    return NextResponse.json({ success: true, bot: randomBot.name, post: newPost }, { status: 201 });

  } catch (error: any) {
    console.error("Bot Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
