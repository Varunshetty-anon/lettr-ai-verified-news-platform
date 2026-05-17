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
  if (bodyWordCount < 150) issues.push('The article body is brief, limiting claim-level context for verification.');
  if (headline.trim().split(/\s+/).filter(Boolean).length > 15) issues.push('The headline is longer than LETTR editorial guidelines.');

  const sourceScore = Math.min(35, sources.length * 12);
  const bodyScore = bodyWordCount >= 300 ? 25 : bodyWordCount >= 150 ? 18 : 8;
  const mediaScore = hasMedia ? 5 : 0;
  const score = Math.max(25, Math.min(70, 25 + sourceScore + bodyScore + mediaScore - issues.length * 6));

  const evidenceText = sources.length > 0
    ? `${sources.length} source link${sources.length === 1 ? '' : 's'} were provided for review`
    : 'no source links were provided';
  const mediaText = hasMedia
    ? `The submission also includes ${mediaContext?.videoUrl ? 'video' : 'image'} evidence, which should be checked against the article claims.`
    : 'No image or video evidence was supplied.';

  return {
    factScore: score,
    factSummary: `This score reflects a limited automated review because ${reason}. The headline "${headline}" was evaluated against the submitted article body: ${evidenceText}, and the article contains roughly ${bodyWordCount} words of context. ${mediaText} The report cannot receive a high-confidence score until the core claims are corroborated against the linked sources and any media metadata.`,
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

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `You are an elite journalistic fact-checker. Analyze the news content, source links, image context, and video context.
            Be strict and consistent. A score of 85+ means the content is well-sourced with verifiable facts. A score below 50 means the content has significant unverified claims or is opinion-based. Never give a score above 70 to content that contains no external source links.
            Return output exactly as a JSON object with no markdown formatting.
            {
              "factScore": <0-100>,
              "summary": "<Explain exactly why this score was given based on the facts, source links, and media evidence. Note corroborated claims, unsupported claims, missing context, or biased framing.>",
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
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      return buildLocalVerificationResult(headline, body, referenceLink, mediaContext, `the verification provider returned HTTP ${response.status}`);
    }

    const data = await response.json();
    const outputText = data.choices?.[0]?.message?.content || "{}";
    
    try {
      const parsed = JSON.parse(outputText);
      return { 
        factScore: parsed.factScore ?? 50,
        factSummary: parsed.summary || parsed.factSummary || buildLocalVerificationResult(headline, body, referenceLink, mediaContext, 'the verification provider omitted a written justification').factSummary,
        confidence: parsed.confidence || "Medium",
        sourcesChecked: parsed.sourcesChecked ?? extractSourceLinks(referenceLink).length,
        issues: parsed.issues || parsed.keyIssues || []
      };
    } catch (parseError) {
      console.error("Fact verification JSON parse error:", parseError);
      return buildLocalVerificationResult(headline, body, referenceLink, mediaContext, 'the verification provider returned an unreadable response');
    }

  } catch (error) {
    console.error("Fact verification Error (Groq):", error);
    return buildLocalVerificationResult(headline, body, referenceLink, mediaContext, 'the verification request failed before completion');
  }
}
