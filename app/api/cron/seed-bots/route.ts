import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getVerifiedBots } from '@/lib/bot-profiles';
import { verifyFact } from '@/lib/ai-verification';
import { Post } from '@/models/Post';

const NVAPI_KEY = "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";

// Map bots to their respective sources
const BOT_SOURCES: Record<string, string[]> = {
  'TechNews Bot': ['https://www.reddit.com/r/technology/hot.json?limit=10', 'https://www.reddit.com/r/gadgets/hot.json?limit=10'],
  'GlobalPolitics Bot': ['https://www.reddit.com/r/politics/hot.json?limit=10', 'https://www.reddit.com/r/geopolitics/hot.json?limit=10'],
  'Finance Bot': ['https://www.reddit.com/r/economics/hot.json?limit=10', 'https://www.reddit.com/r/finance/hot.json?limit=10'],
  'AI Insider Bot': ['https://www.reddit.com/r/artificial/hot.json?limit=10', 'https://www.reddit.com/r/MachineLearning/hot.json?limit=10'],
  'WorldNews Bot': ['https://www.reddit.com/r/worldnews/hot.json?limit=10', 'https://www.reddit.com/r/news/hot.json?limit=10']
};

export async function GET(request: Request) {
  if (process.env.DEMO_MODE !== "true") {
      return NextResponse.json({ message: "DEMO_MODE disabled. Bot engine inactive." }, { status: 200 });
  }

  await dbConnect();
  
  try {
     const activeBots = await getVerifiedBots();
     const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
     const sources = BOT_SOURCES[randomBot.name] || BOT_SOURCES['WorldNews Bot'];
     const sourceUrl = sources[Math.floor(Math.random() * sources.length)];

     const response = await fetch(sourceUrl);
     const redditData = await response.json();
     
     // Retrieve a random post from the top 10
     const posts = redditData.data.children;
     const targetContent = posts[Math.floor(Math.random() * posts.length)].data;

     const rawTitle = targetContent.title;
     // Sometimes selftext is empty, we fall back to title or url
     const rawText = targetContent.selftext || `Link posted: ${targetContent.url}`;
     const originalLink = targetContent.url;
     const originTag = `Source: Reddit (r/${targetContent.subreddit})`;
     
     // Media handling (Subreddit thumbnail/image). 
     // We capture the image. Supabase upload is stubbed below.
     let mediaUrl = targetContent.thumbnail;
     if (mediaUrl === 'self' || mediaUrl === 'default') mediaUrl = undefined;

     // 1. REWRITE VIA GEMMA
     const rewritePrompt = `
       Act as a professional news editor. Rewrite the following raw internet content into a serious, credible news headline and a short 2-4 line summary. 
       Do NOT copy the raw text. Make it sound like a premium news brief.
       Raw Title: ${rawTitle}
       Raw Text: ${rawText}

       Output ONLY valid JSON containing EXACTLY:
       {
         "cleanHeadline": "...",
         "cleanSummary": "..."
       }
     `;

    const rewriteResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVAPI_KEY}`
      },
      body: JSON.stringify({
        model: "google/gemma-2-9b-it",
        messages: [{ role: "user", content: rewritePrompt }],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })
    });

    const rewriteData = await rewriteResponse.json();
    const rewriteContent = JSON.parse(rewriteData.choices[0].message.content);

    // 2. FACT VERIFICATION
    const verification = await verifyFact(rewriteContent.cleanHeadline, rewriteContent.cleanSummary, originalLink);

    // 3. POST RULES ENFORCEMENT
    if (verification.factScore < 45) {
       console.log(`Bot ${randomBot.name} generated low-quality content (${verification.factScore}). Rejected.`);
       return NextResponse.json({ message: "Content rejected by AI Fact rules." }, { status: 200 });
    }

    // 4. SUPABASE MEDIA STUB (Assuming 'mediaUrl' exists, the bot uploads stream to bucket here)
    // if (mediaUrl) { mediaUrl = await uploadToSupabase(mediaUrl); }

    // 5. DB INJECTION
    const newPost = await Post.create({
       authorId: randomBot._id,
       headline: rewriteContent.cleanHeadline,
       description: rewriteContent.cleanSummary,
       sourceLink: originalLink,
       originSource: originTag,
       mediaUrl: mediaUrl,
       factScore: verification.factScore,
       reasoning: verification.reasoning,
       isPublished: true,
       engagement: Math.floor(Math.random() * 50) + 1 // Simulate minor early traction
    });

    return NextResponse.json({ success: true, post: newPost }, { status: 201 });

  } catch (error: any) {
    console.error("Bot Engine Execution Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
