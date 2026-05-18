export interface ProcessedArticle {
  headline: string;
  body: string;
  category: string;
  newsworthiness: number; // 0-100, reject below threshold
}

// ─── Model Routing ─────────────────────────────────────────────
// Use CHEAP model for content processing (categorization, cleanup, rewrite)
// Premium model is reserved ONLY for fact verification
const CONTENT_MODEL = "llama-3.1-8b-instant";

// ─── Rate Limit Cooldown ───────────────────────────────────────
let lastRateLimitHit = 0;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

function isInCooldown(): boolean {
  return Date.now() - lastRateLimitHit < RATE_LIMIT_COOLDOWN_MS;
}

// ─── Pre-Filter: Reject non-news junk BEFORE wasting tokens ────
const JUNK_PATTERNS = [
  /\b(meme|shitpost|eli5|rant|unpopular opinion|hot take|change my view)\b/i,
  /\b(my experience|my story|i just|i've been|i feel|i think we should)\b/i,
  /\b(upvote|downvote|karma|reddit gold|award|repost)\b/i,
  /\b(screenshot|look at this|check this out|found this gem)\b/i,
  /\[poll\]|\[question\]|\[discussion\]|\[rant\]|\[vent\]|\[help\]/i,
  /^(TIL|TIFU|AITA|WIBTA|CMV|ELI5|DAE)\b/i,
  /\b(anyone else|does anyone|am i the only)\b/i,
  /\b(boyfriend|girlfriend|husband|wife|roommate|landlord)\b.*\b(won't|doesn't|refuses)\b/i,
];

const NEWSWORTHY_SIGNALS = [
  /\b(government|ministry|parliament|congress|senate|court|supreme court)\b/i,
  /\b(CEO|company|billion|million|startup|IPO|acquisition|merger|funding)\b/i,
  /\b(research|study|university|scientists|discovered|breakthrough)\b/i,
  /\b(launched|announced|released|unveiled|introduced|signed)\b/i,
  /\b(policy|regulation|law|bill|amendment|executive order)\b/i,
  /\b(NASA|ISRO|SpaceX|ESA|satellite|rocket|orbit|Mars|Moon)\b/i,
  /\b(GDP|inflation|trade|export|import|sanctions|tariff)\b/i,
  /\b(election|vote|candidate|party|coalition|campaign)\b/i,
  /\b(WHO|UN|NATO|EU|BRICS|G7|G20|IMF|World Bank)\b/i,
  /\b(AI|artificial intelligence|machine learning|quantum|semiconductor)\b/i,
  /\b(climate|renewable|solar|wind|carbon|emissions)\b/i,
  /\b(FDA|vaccine|clinical trial|drug approval|pandemic)\b/i,
];

function preFilterContent(title: string, body: string): { pass: boolean; score: number } {
  const combined = `${title} ${body}`.toLowerCase();
  
  // Check for junk patterns
  let junkHits = 0;
  for (const pattern of JUNK_PATTERNS) {
    if (pattern.test(combined)) junkHits++;
  }
  
  // Check for newsworthy signals
  let newsHits = 0;
  for (const pattern of NEWSWORTHY_SIGNALS) {
    if (pattern.test(combined)) newsHits++;
  }
  
  // Score calculation
  const score = Math.max(0, Math.min(100, (newsHits * 15) - (junkHits * 25) + 30));
  
  // Reject if too junky or not newsworthy enough
  const pass = junkHits < 2 && score >= 25;
  
  return { pass, score };
}

// ─── Headline Sanitization ─────────────────────────────────────
function sanitizeHeadline(raw: string): string {
  return raw
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[.*?\]/g, '')         // remove tags like [D], [P]
    .replace(/\s+/g, ' ')
    .trim();
}

// ─── Main Content Processor ────────────────────────────────────
export async function processRawContent(
  rawHeadline: string,
  rawBody: string,
  targetCategory: string
): Promise<ProcessedArticle | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[ContentProcessor] No GROQ_API_KEY found, skipping.");
    return null;
  }

  if (isInCooldown()) {
    console.warn("[ContentProcessor] In rate-limit cooldown. Skipping this post.");
    return null;
  }

  const cleanHeadline = sanitizeHeadline(rawHeadline);

  // ── Pre-Filter: Reject junk before wasting API tokens ──
  const { pass, score: newsworthinessScore } = preFilterContent(cleanHeadline, rawBody);
  if (!pass) {
    console.warn(`[ContentProcessor] Pre-filter rejected: "${cleanHeadline.substring(0, 60)}" (score: ${newsworthinessScore})`);
    return null;
  }

  // If the body is too short, reject early
  if (!rawBody || rawBody.length < 50) {
    console.warn("[ContentProcessor] Raw body too short, rejecting early.");
    return null;
  }

  const prompt = `You are an elite editorial journalist for LETTR, an AI-verified news platform.
Your job is to take raw, scraped content (often from Reddit or RSS) and transform it into a premium, highly credible news article.

Raw Headline: ${cleanHeadline}
Raw Content: ${rawBody.substring(0, 2500)}
Target Category Hint: ${targetCategory}

STRICT REJECTION CRITERIA (return {"reject": true} if ANY apply):
- Content is a meme, joke, or shitpost
- Content is a personal story or anecdote (not news)
- Content is a poll, question, or discussion prompt
- Content is a screenshot description with no factual substance
- Content contains no verifiable facts or named entities
- Content is too vague to construct 3 meaningful paragraphs

INSTRUCTIONS (if content passes):
1. HEADLINE: Write a short, punchy, professional headline (max 12-15 words). No tags, no HTML entities, no conversational tone.
2. BODY: Write exactly 3 distinct paragraphs (minimum 300 words total):
   - Paragraph 1: What happened (The core news/announcement).
   - Paragraph 2: Why it matters (The impact, implications, or significance).
   - Paragraph 3: Context/Background (Historical context or broader industry trends).
   NEVER include "Article URL:", "Comments URL:", Reddit metrics, polls, or markdown links.
3. CATEGORY: Assign from this strict list:
   ['AI & Tech', 'World', 'Finance', 'Space', 'Health', 'Culture', 'Indian Politics', 'Indian Tech', 'Indian Startups', 'Indian Business', 'Indian Science', 'Indian Sports', 'Indian Entertainment', 'Geopolitics', 'Science', 'Crypto', 'Energy', 'Climate']
   RULES:
   - 'Indian Politics': ONLY if about India's government, parliament, elections, Indian domestic policy. NOT US/China/global politics.
   - 'AI & Tech': Only AI, semiconductors, robotics, software, innovation.
   - If low confidence, fallback to 'World'.
4. NEWSWORTHINESS: Rate 0-100 how newsworthy this content is (above 40 = publishable).

Return JSON:
{
  "headline": "<clean editorial headline>",
  "body": "<the 3-paragraph editorial body>",
  "category": "<strictly selected category>",
  "newsworthiness": <0-100>
}`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: CONTENT_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (response.status === 429) {
      lastRateLimitHit = Date.now();
      console.warn("[ContentProcessor] 429 rate limit. Cooldown activated.");
      return null;
    }

    if (!response.ok) {
      console.error(`[ContentProcessor] LLM API failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    if (result.reject) {
      console.warn(`[ContentProcessor] LLM rejected: "${cleanHeadline.substring(0, 60)}"`);
      return null;
    }

    if (!result.headline || !result.body || !result.category) {
      console.warn("[ContentProcessor] Incomplete LLM response.");
      return null;
    }

    // Final quality gate
    const wordCount = result.body.split(/\s+/).length;
    if (wordCount < 80) {
      console.warn(`[ContentProcessor] Rejected: insufficient length (${wordCount} words)`);
      return null;
    }

    // Newsworthiness gate
    const newsworthiness = result.newsworthiness ?? newsworthinessScore;
    if (newsworthiness < 35) {
      console.warn(`[ContentProcessor] Rejected: low newsworthiness (${newsworthiness})`);
      return null;
    }

    return {
      headline: result.headline,
      body: result.body,
      category: result.category,
      newsworthiness
    };

  } catch (e) {
    console.error("[ContentProcessor] Error processing article:", e);
    return null;
  }
}

// Export cooldown checker for bot throttling
export function isContentProcessorCoolingDown(): boolean {
  return isInCooldown();
}
