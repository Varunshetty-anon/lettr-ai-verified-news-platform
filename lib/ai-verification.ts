export interface VerificationResult {
  factScore: number;
  reasoning: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function verifyFact(headline: string, description: string, referenceLink?: string, retries = 2): Promise<VerificationResult> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.warn("Missing GROQ_API_KEY, defaulting to 50");
    return { factScore: 50, reasoning: "Unverified (Missing API Key)." };
  }

  const trimmedDesc = description.length > 600 ? description.substring(0, 600) + "..." : description;

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
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
            content: "You are a strict fact-checking AI. Always give a factual accuracy score from 0 to 100."
          },
          {
            role: "user",
            content: `Analyze this news content:\nHeadline: ${headline}\nSummary: ${trimmedDesc}\nSource: ${referenceLink || 'None'}\n\nReturn ONLY:\nScore: <number>\nReason: <1 short line>`
          }
        ],
        temperature: 0.1
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const outputText = data.choices[0]?.message.content || "";
    
    const scoreMatch = outputText.match(/Score:\s*(\d{1,3})/i);
    const reasonMatch = outputText.match(/Reason:\s*(.*)/i);

    const factScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;
    const reasoning = reasonMatch ? reasonMatch[1].trim() : "System evaluation incomplete. Assuming verified status.";

    return { factScore, reasoning };

  } catch (error) {
    console.error("Fact verification Error (Groq):", error);
    return { factScore: 50, reasoning: "Unverified (API Error / Timeout)." };
  }
}
