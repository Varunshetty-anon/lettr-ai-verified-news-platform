import { NextResponse } from 'next/server';
import crypto from 'crypto';
import dbConnect from '@/lib/mongodb';
import { getVerifiedBots } from '@/lib/bot-profiles';
import { verifyFact } from '@/lib/ai-verification';
import { Post } from '@/models/Post';

// Map bots to their respective sources and categories
const BOT_CONFIG: Record<string, { sources: string[]; category: string }> = {
  'TechNews Bot': {
    sources: ['https://www.reddit.com/r/technology/hot.json?limit=15', 'https://www.reddit.com/r/gadgets/hot.json?limit=15'],
    category: 'Technology'
  },
  'GlobalPolitics Bot': {
    sources: ['https://www.reddit.com/r/politics/hot.json?limit=15', 'https://www.reddit.com/r/geopolitics/hot.json?limit=15'],
    category: 'Politics'
  },
  'Finance Bot': {
    sources: ['https://www.reddit.com/r/economics/hot.json?limit=15', 'https://www.reddit.com/r/finance/hot.json?limit=15'],
    category: 'Economy'
  },
  'AI Insider Bot': {
    sources: ['https://www.reddit.com/r/artificial/hot.json?limit=15', 'https://www.reddit.com/r/MachineLearning/hot.json?limit=15'],
    category: 'Technology'
  },
  'WorldNews Bot': {
    sources: ['https://www.reddit.com/r/worldnews/hot.json?limit=15', 'https://www.reddit.com/r/news/hot.json?limit=15'],
    category: 'World'
  }
};

function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

export async function GET(request: Request) {
  if (process.env.DEMO_MODE !== "true") {
    return NextResponse.json({ message: "DEMO_MODE disabled." }, { status: 200 });
  }

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
    
    let mediaUrl = targetContent.thumbnail;
    if (mediaUrl === 'self' || mediaUrl === 'default' || mediaUrl === 'nsfw') mediaUrl = undefined;

    // 1. REWRITE VIA GROQ
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ API Key");

    let rewriteContent = { cleanHeadline: rawTitle, cleanSummary: "Live news feed summary." };

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
              content: "Act as a professional news editor. Output exactly the requested format. Be concise."
            },
            {
              role: "user",
              content: `Rewrite the following raw text into a serious headline and a short 2 line summary. Do NOT copy raw text.\n\nRaw Title: ${rawTitle}\nRaw Text: ${rawText.substring(0, 500)}\n\nFormat:\nHeadline: <text>\nSummary: <text>`
            }
          ],
          temperature: 0.3
        })
      });

      if (rewriteResponse.ok) {
        const rewriteData = await rewriteResponse.json();
        const outputText = rewriteData.choices[0]?.message?.content || "";
        const headMatch = outputText.match(/Headline:\s*(.*)/i);
        const sumMatch = outputText.match(/Summary:\s*((.|\n)*)/i);
        if (headMatch) rewriteContent.cleanHeadline = headMatch[1].trim();
        if (sumMatch) rewriteContent.cleanSummary = sumMatch[1].trim();
      }
    } catch (e) {
      console.error("Groq Rewrite Failed, using raw title.", e);
    }

    // 2. FACT VERIFICATION
    const verification = await verifyFact(rewriteContent.cleanHeadline, rewriteContent.cleanSummary, originalLink);

    // 3. POST RULES ENFORCEMENT
    if (verification.factScore < 45) {
      return NextResponse.json({ message: "Content rejected by AI Fact rules.", factScore: verification.factScore }, { status: 200 });
    }

    // 4. DB INJECTION
    const newPost = await Post.create({
      authorId: randomBot._id,
      headline: rewriteContent.cleanHeadline,
      description: rewriteContent.cleanSummary,
      sourceLink: originalLink,
      sourceHash: urlHash,
      originSource: originTag,
      category: config.category,
      mediaUrl: mediaUrl,
      factScore: verification.factScore,
      reasoning: verification.reasoning,
      isPublished: true,
      engagement: Math.floor(Math.random() * 80) + 5
    });

    return NextResponse.json({ success: true, bot: randomBot.name, post: newPost }, { status: 201 });

  } catch (error: any) {
    console.error("Bot Engine Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
