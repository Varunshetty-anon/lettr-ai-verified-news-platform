const NVAPI_KEY = "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";

export interface VerificationResult {
  factScore: number;
  reasoning: string;
}

export async function verifyFact(headline: string, description: string, referenceLink?: string): Promise<VerificationResult> {
  const prompt = `
    You are an expert fact-checker. 
    Analyze the following news post:
    Headline: "${headline}"
    Description: "${description}"
    Reference Link: "${referenceLink || 'None'}"

    Evaluate factual accuracy, consistency, and any misinformation signals.
    Output ONLY valid JSON with two exact fields:
    {
      "factScore": (a number between 0 and 100 representing factual accuracy),
      "reasoning": (a short string, max 2 sentences with the reasoning)
    }
  `;

  try {
    const response = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVAPI_KEY}`
      },
      body: JSON.stringify({
        model: "google/gemma-2-9b-it", // Using Gemma as specified
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 256,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
        throw new Error(`AI Verification failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const parsed = JSON.parse(content);
    
    return {
      factScore: typeof parsed.factScore === 'number' ? parsed.factScore : parseInt(parsed.factScore) || 50,
      reasoning: parsed.reasoning || "System evaluation complete."
    };
  } catch (error) {
    console.error("Fact verification Error:", error);
    // Fallback if API is unreachable (so development isn't fully blocked)
    return { factScore: 50, reasoning: "Unable to verify facts due to network error." };
  }
}
