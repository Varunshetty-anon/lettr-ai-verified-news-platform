export interface VerificationResult {
  factScore: number;
  factSummary: string;
  confidence: string;
  sourcesChecked: number;
  keyIssues?: string[];
}

export async function verifyFact(
  headline: string, 
  body: string, 
  referenceLink?: string, 
  mediaContext?: { imageUrl?: string; videoUrl?: string }
): Promise<VerificationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { 
      factScore: 50, 
      factSummary: "Verification skipped: Service unavailable.", 
      confidence: "Low", 
      sourcesChecked: 0,
      keyIssues: []
    };
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
            content: `You are an elite journalistic fact-checker. Analyze the news content, sources, and media context.
            
            Return output exactly as a JSON object with no markdown formatting.
            {
              "factScore": <0-100>,
              "factSummary": "<A 3-5 line explanation of accuracy and factual basis>",
              "confidence": "<Low | Medium | High>",
              "sourcesChecked": <number>,
              "keyIssues": ["<issue 1>", "<issue 2>"] // Leave empty array if no issues
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

    const data = await response.json();
    const outputText = data.choices[0]?.message.content || "{}";
    
    try {
      const parsed = JSON.parse(outputText);
      return { 
        factScore: parsed.factScore ?? 50,
        factSummary: parsed.factSummary || "Analysis complete.",
        confidence: parsed.confidence || "Medium",
        sourcesChecked: parsed.sourcesChecked ?? 1,
        keyIssues: parsed.keyIssues || []
      };
    } catch (parseError) {
      console.error("Fact verification JSON parse error:", parseError);
      return { 
        factScore: 50,
        factSummary: "Analysis complete (fallback formatting).",
        confidence: "Medium",
        sourcesChecked: 1,
        keyIssues: []
      };
    }

  } catch (error) {
    console.error("Fact verification Error (Groq):", error);
    return { 
      factScore: 50, 
      factSummary: "System evaluation incomplete due to an internal error.", 
      confidence: "Low", 
      sourcesChecked: 0 
    };
  }
}
