export interface VerificationResult {
  factScore: number;
  factSummary: string;
  confidence: string;
  sourcesChecked: number;
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
      sourcesChecked: 0 
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
            
            Return output exactly as:
            Fact Score: <0-100>
            Fact Summary: <A 2-3 sentence explanation>
            Confidence: <Low | Medium | High>
            Sources Checked: <number>`
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
        temperature: 0.1
      })
    });

    const data = await response.json();
    const outputText = data.choices[0]?.message.content || "";
    
    const scoreMatch = outputText.match(/Fact Score:\s*(\d+)/i);
    const summaryMatch = outputText.match(/Fact Summary:\s*([\s\S]*?)(?=\nConfidence:)/i) || outputText.match(/Fact Summary:\s*(.*)/i);
    const confidenceMatch = outputText.match(/Confidence:\s*(.*)/i);
    const sourcesMatch = outputText.match(/Sources Checked:\s*(\d+)/i);

    return { 
      factScore: scoreMatch ? parseInt(scoreMatch[1], 10) : 50,
      factSummary: summaryMatch ? summaryMatch[1].trim() : "Analysis complete.",
      confidence: confidenceMatch ? confidenceMatch[1].trim() : "Medium",
      sourcesChecked: sourcesMatch ? parseInt(sourcesMatch[1], 10) : 1
    };

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
