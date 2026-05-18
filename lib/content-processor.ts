export interface ProcessedArticle {
  headline: string;
  body: string;
  category: string;
}

export async function processRawContent(
  rawHeadline: string,
  rawBody: string,
  targetCategory: string
): Promise<ProcessedArticle | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("[ContentProcessor] No GROQ_API_KEY found, skipping intelligent processing.");
    return null;
  }

  // Pre-clean obviously bad inputs to save tokens
  const cleanHeadline = rawHeadline
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\[.*?\]/g, '') // remove tags like [D], [P]
    .replace(/\s+/g, ' ')
    .trim();

  // If the body is just an article URL or extremely short without real text, we probably shouldn't even ask the LLM
  if (!rawBody || rawBody.length < 50) {
    console.warn("[ContentProcessor] Raw body too short, rejecting early.");
    return null;
  }

  const prompt = `You are an elite editorial journalist for LETTR, an AI-verified news platform.
Your job is to take raw, scraped content (often from Reddit or RSS) and transform it into a premium, highly credible news article.

Raw Headline: ${cleanHeadline}
Raw Content: ${rawBody.substring(0, 3000)}
Target Category Hint: ${targetCategory}

INSTRUCTIONS:
1. HEADLINE: Write a short, punchy, professional headline (max 12-15 words). Strip all tags, HTML entities, or conversational tone.
2. BODY: You MUST write exactly 3 distinct paragraphs (minimum 400 words total):
   - Paragraph 1: What happened (The core news/announcement).
   - Paragraph 2: Why it matters (The impact, implications, or significance).
   - Paragraph 3: Context/Background (Historical context or broader industry trends).
   Never include "Article URL:", "Comments URL:", Reddit metrics (upvotes), polls, or markdown links.
3. CATEGORY: Intelligently assign the best category from this strict list:
   ['AI & Tech', 'World', 'Finance', 'Space', 'Health', 'Culture', 'Indian Politics', 'Indian Economy', 'Startups India', 'Geopolitics', 'Science', 'Crypto', 'Energy', 'Climate', 'Entertainment', 'Sports'].
   RULES FOR CATEGORIES:
   - 'Indian Politics': Must contain India, Indian government, parliament, elections, policy. NOT US-China geopolitics.
   - 'AI & Tech': Only AI, semiconductors, robotics, software, science, innovation.
   - 'Finance' / 'Indian Economy' / 'Startups India': Startups, markets, business.
   - If low confidence, fallback to 'World'.

Return EXACTLY a JSON object:
{
  "headline": "<clean editorial headline>",
  "body": "<the 3-paragraph editorial body>",
  "category": "<the strictly selected category>"
}

If the raw content is complete junk, spam, or too short to derive a meaningful 3-paragraph article, return:
{ "reject": true }`;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile", // Use a smart model for this task
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      console.error(`[ContentProcessor] LLM API failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const result = JSON.parse(data.choices?.[0]?.message?.content || "{}");

    if (result.reject) {
      console.warn(`[ContentProcessor] Rejected low quality content: ${cleanHeadline}`);
      return null;
    }

    if (!result.headline || !result.body || !result.category) {
      return null;
    }
    
    // Final quality gate
    const wordCount = result.body.split(/\s+/).length;
    if (wordCount < 100) { // Enforce a realistic minimum post-LLM
       console.warn(`[ContentProcessor] Rejected due to insufficient length (${wordCount} words)`);
       return null;
    }

    return {
      headline: result.headline,
      body: result.body,
      category: result.category
    };

  } catch (e) {
    console.error("[ContentProcessor] Error processing article:", e);
    return null;
  }
}
