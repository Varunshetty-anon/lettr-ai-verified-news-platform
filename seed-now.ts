import dotenv from 'dotenv';
import path from 'path';
import crypto from 'crypto';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import dbConnect from './lib/mongodb';
import { getVerifiedBots } from './lib/bot-profiles';
import { verifyFact } from './lib/ai-verification';
import { Post } from './models/Post';
import { User } from './models/User';
import { uploadMediaFromUrl } from './lib/supabase';

const BOT_CONFIG: Record<string, { sources: string[]; category: string }> = {
  'TechNews Bot': { sources: ['https://www.reddit.com/r/technology/hot.json?limit=15', 'https://www.reddit.com/r/gadgets/hot.json?limit=15'], category: 'AI & Tech' },
  'GlobalPolitics Bot': { sources: ['https://www.reddit.com/r/geopolitics/hot.json?limit=15', 'https://www.reddit.com/r/worldnews/hot.json?limit=15'], category: 'Geopolitics' },
  'Finance Bot': { sources: ['https://www.reddit.com/r/economics/hot.json?limit=15', 'https://www.reddit.com/r/finance/hot.json?limit=15'], category: 'Finance' },
  'AI Insider Bot': { sources: ['https://www.reddit.com/r/artificial/hot.json?limit=15', 'https://www.reddit.com/r/MachineLearning/hot.json?limit=15'], category: 'AI & Tech' },
  'WorldNews Bot': { sources: ['https://www.reddit.com/r/worldnews/hot.json?limit=15', 'https://www.reddit.com/r/news/hot.json?limit=15'], category: 'Geopolitics' },
  'Science Bot': { sources: ['https://www.reddit.com/r/science/hot.json?limit=15', 'https://www.reddit.com/r/EverythingScience/hot.json?limit=15'], category: 'Science' },
  'Crypto Bot': { sources: ['https://www.reddit.com/r/CryptoCurrency/hot.json?limit=15', 'https://www.reddit.com/r/Bitcoin/hot.json?limit=15'], category: 'Crypto' },
  'Space Bot': { sources: ['https://www.reddit.com/r/space/hot.json?limit=15', 'https://www.reddit.com/r/spacex/hot.json?limit=15'], category: 'Space' },
  'Health Bot': { sources: ['https://www.reddit.com/r/Health/hot.json?limit=15', 'https://www.reddit.com/r/medicine/hot.json?limit=15'], category: 'Health' },
  'Energy Bot': { sources: ['https://www.reddit.com/r/energy/hot.json?limit=15', 'https://www.reddit.com/r/RenewableEnergy/hot.json?limit=15'], category: 'Energy' },
  'Defense Bot': { sources: ['https://www.reddit.com/r/defense/hot.json?limit=15', 'https://www.reddit.com/r/Military/hot.json?limit=15'], category: 'Defense' },
  'Startup Bot': { sources: ['https://www.reddit.com/r/startups/hot.json?limit=15', 'https://www.reddit.com/r/Entrepreneur/hot.json?limit=15'], category: 'Startups' },
};

function hashUrl(url: string): string {
  return crypto.createHash('md5').update(url).digest('hex');
}

function extractMediaFromReddit(data: any): { image?: string; video?: string } {
  if (data.is_video && data.media?.reddit_video?.fallback_url) return { video: data.media.reddit_video.fallback_url };
  if (data.url && /\.(jpg|jpeg|png|gif|webp)(\?.*)?$/i.test(data.url)) return { image: data.url };
  if (data.preview?.images?.[0]?.source?.url) return { image: data.preview.images[0].source.url.replace(/&amp;/g, '&') };
  if (data.thumbnail && data.thumbnail.startsWith('http') && data.thumbnail !== 'self' && data.thumbnail !== 'default' && data.thumbnail !== 'nsfw') return { image: data.thumbnail };
  return {};
}

async function runOnce() {
  try {
    await dbConnect();
    const activeBots = await getVerifiedBots();
    const randomBot = activeBots[Math.floor(Math.random() * activeBots.length)];
    const config = BOT_CONFIG[randomBot.name] || BOT_CONFIG['WorldNews Bot'];
    const sourceUrl = config.sources[Math.floor(Math.random() * config.sources.length)];

    const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'LettrBot/2.0' } });
    const redditData = await response.json();
    const posts = redditData.data?.children;
    if (!posts || posts.length === 0) return;

    const shuffled = posts.sort(() => Math.random() - 0.5);
    let targetContent = null;
    for (const post of shuffled) {
      const existing = await Post.findOne({ sourceHash: hashUrl(post.data.url) });
      if (!existing) { targetContent = post.data; break; }
    }
    if (!targetContent) return;

    const originalLink = targetContent.url;
    let media = extractMediaFromReddit(targetContent);
    let imageUrl, videoUrl;
    if (media.image) {
      const uploadedUrl = await uploadMediaFromUrl(media.image, `${crypto.randomBytes(4).toString('hex')}.jpg`);
      imageUrl = uploadedUrl || media.image;
    } else if (media.video) {
      videoUrl = media.video;
    }

    const apiKey = process.env.GROQ_API_KEY;
    const rewriteResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST", headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: "You are a senior news editor." }, { role: "user", content: `Rewrite this: Title: ${targetContent.title}\nText: ${targetContent.selftext?.substring(0, 500) || targetContent.url}\n\nFormat:\nHeadline: \nSummary: \nArticle: \nSource Note: ` }],
        temperature: 0.4, max_tokens: 1000
      })
    });
    
    let cleanHeadline = targetContent.title;
    let cleanSummary = "Summary";
    let fullBody = "";
    let sourceNote = "";

    if (rewriteResponse.ok) {
        const data = await rewriteResponse.json();
        const text = data.choices[0]?.message?.content || "";
        cleanHeadline = text.match(/Headline:\s*(.*)/i)?.[1]?.trim() || cleanHeadline;
        cleanSummary = text.match(/Summary:\s*([\s\S]*?)(?=\nArticle:)/i)?.[1]?.trim() || cleanSummary;
        fullBody = text.match(/Article:\s*([\s\S]*?)(?=\nSource Note:)/i)?.[1]?.trim() || fullBody;
        sourceNote = text.match(/Source Note:\s*(.*)/i)?.[1]?.trim() || sourceNote;
    }

    const verification = await verifyFact(cleanHeadline, cleanSummary, originalLink);
    if (verification.factScore < 45) return;

    await Post.create({
      authorId: randomBot._id, headline: cleanHeadline, description: cleanSummary, body: fullBody || cleanSummary,
      sourceLink: originalLink, sourceHash: hashUrl(originalLink), originSource: sourceNote || 'Reddit', category: config.category,
      imageUrl, videoUrl, factScore: verification.factScore,
      factSummary: verification.factSummary,
      confidence: verification.confidence,
      sourcesChecked: verification.sourcesChecked,
      isPublished: true,
    });
    await User.findByIdAndUpdate(randomBot._id, { $inc: { totalPosts: 1 } });
    console.log(`Created: ${cleanHeadline}`);
  } catch (e) {
      console.log(e);
  }
}

async function seed() {
  console.log("Seeding multiple posts to bring feed up to date natively...");
  for (let i = 0; i < 5; i++) {
    console.log(`Job ${i+1}...`);
    await runOnce();
    await new Promise(r => setTimeout(r, 2000));
  }
  console.log("Seeding complete!");
  process.exit(0);
}

seed();
