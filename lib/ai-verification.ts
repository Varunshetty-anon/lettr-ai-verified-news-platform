export interface VerificationResult {
  factScore: number;
  reasoning: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function verifyFact(headline: string, description: string, referenceLink?: string, retries = 2): Promise<VerificationResult> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    console.warn("Missing HUGGINGFACE_API_KEY, defaulting to 50");
    return { factScore: 50, reasoning: "Unverified (Missing API Key)." };
  }

  // Trim to reduce latency
  const trimmedDesc = description.length > 600 ? description.substring(0, 600) + "..." : description;

  const prompt = `Analyze the following news content for factual accuracy.

Content:
Headline: ${headline}
Summary: ${trimmedDesc}
Source: ${referenceLink || 'None'}

Tasks:
1. Verify against general knowledge and reliable sources
2. Estimate factual accuracy
3. Output ONLY:
   - Fact Score (0-100)
   - Short reasoning (1 line)

Format:
Score: <number>
Reason: <text>`;

  try {
    const response = await fetch("https://api-inference.huggingface.co/models/google/gemma-7b-it", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 100, temperature: 0.1 }
      })
    });

    if (!response.ok) {
      if (response.status === 503 && retries > 0) {
        console.log("HF Model Cold Start. Waiting 15 seconds...");
        await sleep(15000); // Wait for HF to load the model
        return verifyFact(headline, description, referenceLink, retries - 1);
      }
      throw new Error(`HF API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const outputText = data[0]?.generated_text || "";
    
    // The HF models repeat the prompt. We parse the last section.
    const extractionMatch = outputText.substring(prompt.length);
    
    const scoreMatch = extractionMatch.match(/Score:\s*(\d{1,3})/i);
    const reasonMatch = extractionMatch.match(/Reason:\s*(.*)/i);

    const factScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
    const reasoning = reasonMatch ? reasonMatch[1].trim() : "System evaluation incomplete. Assuming verified status.";

    return { factScore, reasoning };

  } catch (error) {
    console.error("Fact verification Error (HF):", error);
    return { factScore: 50, reasoning: "Unverified (API Error / Timeout)." };
  }
}
