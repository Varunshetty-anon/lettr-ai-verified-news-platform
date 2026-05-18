export interface VerificationResult {
  factScore: number;
  factSummary: string;
  confidence: string;
  sourcesChecked: number;
  issues?: string[];
}

function extractSourceLinks(referenceLink?: string) {
  if (!referenceLink) return [];
  return referenceLink
    .split(/[\s,\n]+/)
    .map(link => link.trim())
    .filter(link => /^https?:\/\//i.test(link));
}

function buildLocalVerificationResult(
  headline: string,
  body: string,
  referenceLink?: string,
  mediaContext?: { imageUrl?: string; videoUrl?: string },
  reason = 'the live AI verification service was unavailable'
): VerificationResult {
  const sources = extractSourceLinks(referenceLink);
  const bodyWordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const hasMedia = Boolean(mediaContext?.imageUrl || mediaContext?.videoUrl);
  const issues: string[] = [];

  if (sources.length === 0) issues.push('No source links were supplied for independent corroboration.');
  if (bodyWordCount < 100) issues.push('The article body is brief, limiting claim-level context for verification.');
  if (headline.trim().split(/\s+/).filter(Boolean).length > 20) issues.push('The headline is unusually long.');

  const baseScore = 40;
  const sourceScore = Math.min(40, sources.length * 20);
  const bodyScore = bodyWordCount >= 200 ? 25 : bodyWordCount >= 100 ? 15 : 5;
  const mediaScore = hasMedia ? 5 : 0;
  const penalty = issues.length * 15;
  
  const score = Math.max(10, Math.min(95, baseScore + sourceScore + bodyScore + mediaScore - penalty));

  const evidenceText = sources.length > 0
    ? `${sources.length} source link${sources.length === 1 ? '' : 's'} were provided`
    : 'no source links were provided';

  return {
    factScore: score,
    factSummary: `Verification confidence temporarily reduced while additional checks complete. Evaluated locally. Evidence: ${evidenceText}. Word count: ${bodyWordCount}. ${hasMedia ? 'Media present.' : ''} Please manually verify claims.`,
    confidence: sources.length > 0 && bodyWordCount >= 150 ? 'Medium' : 'Low',
    sourcesChecked: sources.length,
    issues,
  };
}

export async function verifyFact(
  headline: string, 
  body: string, 
  referenceLink?: string, 
  mediaContext?: { imageUrl?: string; videoUrl?: string }
): Promise<VerificationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return buildLocalVerificationResult(headline, body, referenceLink, mediaContext, 'no verification API key is configured');
  }

  const models = [
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "gemma2-9b-it"
  ];
  
  const messages = [
    {
      role: "system",
      content: `You are an elite journalistic fact-checker. Analyze the news content, source links, image context, and video context.
      Be strict and consistent. A score of 85+ means the content is well-sourced with verifiable facts. A score below 50 means the content has significant unverified claims or is opinion-based. Never give a score above 70 to content that contains no external source links.
      Return output exactly as a JSON object with no markdown formatting.
      {
        "factScore": <0-100>,
        "summary": "<Explain exactly why this score was given based on the facts, source links, and media evidence. You MUST cite specific entities, sources, and claims from the article. Do not use generic boilerplate or automated assessment language. Write it as an editorial note.>",
        "confidence": "<Low | Medium | High>",
        "sourcesChecked": <number of source links reviewed>,
        "issues": ["<issue 1>", "<issue 2>"] // Leave empty array if no issues
      }`
    },
    {
      role: "user",
      content: `
      Headline: ${headline}
      Content: ${body.substring(0, 2000)}
      Sources: ${referenceLink || 'None'}
      Media: ${JSON.stringify(mediaContext || {})}
      `
    }
  ];

  const delays = [2000, 5000, 10000];

  for (let attempt = 0; attempt <= 3; attempt++) {
    for (const model of models) {
      try {
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.1,
            response_format: { type: "json_object" }
          })
        });

        if (response.ok) {
          const data = await response.json();
          const outputText = data.choices?.[0]?.message?.content || "{}";
          try {
            const parsed = JSON.parse(outputText);
            return { 
              factScore: parsed.factScore ?? 50,
              factSummary: parsed.summary || parsed.factSummary || "No summary provided by API.",
              confidence: parsed.confidence || "Medium",
              sourcesChecked: parsed.sourcesChecked ?? extractSourceLinks(referenceLink).length,
              issues: parsed.issues || parsed.keyIssues || []
            };
          } catch (e) {
            console.error("Fact verification JSON parse error:", e);
            continue; // try next model
          }
        }
        
        // If 429 or 503, we break inner loop to trigger exponential backoff retry
        if (response.status === 429 || response.status === 503) {
          console.warn(`[Verification] Model ${model} returned ${response.status}. Attempting fallback or wait...`);
          // We can still try the next model, maybe it has a different rate limit bucket
        }
      } catch (error) {
        console.error(`[Verification] Fetch error on model ${model}:`, error);
      }
    }
    
    // If all models failed, wait before retrying
    if (attempt < 3) {
      console.log(`[Verification] All models failed. Retrying in ${delays[attempt]}ms...`);
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
  }

  // If we reach here, all retries and fallbacks failed. 
  // Trigger TEMPORARY DEMO SAFE MODE
  console.error("[Verification] CRITICAL: All API retries exhausted. Falling back to local DEMO SAFE MODE.");
  return buildLocalVerificationResult(headline, body, referenceLink, mediaContext, 'API quota exceeded after retries');
}
