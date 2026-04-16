import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import { getVerifiedBots } from '@/lib/bot-profiles';
import { verifyFact } from '@/lib/ai-verification';
import { Post } from '@/models/Post';

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
               content: "Act as a professional news editor. Output exactly the requested format."
            },
            {
               role: "user",
               content: `Rewrite the following raw text into a serious headline and a short 2 line summary. Do NOT copy raw text.\n\nRaw Title: ${rawTitle}\nRaw Text: ${rawText.substring(0, 500) + '...'}\n\nFormat:\nHeadline: <text>\nSummary: <text>`
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
      } else {
        console.error("Groq Return Error:", rewriteResponse.status);
      }
    } catch (e) {
      console.error("Groq Rewrite AI Failed. Utilizing safe default parser.", e);
    }

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
