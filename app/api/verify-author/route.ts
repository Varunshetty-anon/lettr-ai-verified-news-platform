import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import dbConnect from '@/lib/mongodb';
import { User } from '@/models/User';

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { content } = await validateRequest(req);

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI Verification Service Unavailable' }, { status: 503 });
    }

    // Call Groq API for verification score
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert fact-checker and journalism evaluator. Evaluate the following text for factual accuracy, neutrality, and journalistic integrity. Provide a score from 0 to 100, where 100 is perfectly factual and well-researched, and 0 is complete falsehood or highly biased opinion. Return exactly in this format: \nScore: <number>\nReasoning: <short reasoning>"
          },
          {
            role: "user",
            content: content.substring(0, 3000)
          }
        ],
        temperature: 0.2,
      })
    });

    if (!response.ok) {
      return NextResponse.json({ error: 'AI Verification Failed' }, { status: 500 });
    }

    const aiData = await response.json();
    const outputText = aiData.choices[0]?.message?.content || "";
    
    const scoreMatch = outputText.match(/Score:\s*(\d+)/i);
    const reasoningMatch = outputText.match(/Reasoning:\s*(.*)/i);
    
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 0;
    const reasoning = reasoningMatch ? reasoningMatch[1].trim() : "Unable to determine reasoning.";

    let isVerified = false;

    if (score >= 85) {
      isVerified = true;
      await dbConnect();
      await User.findOneAndUpdate(
        { email: session.user.email },
        { isVerifiedAuthor: true }
      );
    }

    return NextResponse.json({
      score,
      reasoning,
      isVerified
    });

  } catch (error: any) {
    console.error("Verification Error:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

async function validateRequest(req: Request) {
  const body = await req.json();
  if (!body.content || typeof body.content !== 'string' || body.content.length < 100) {
    throw new Error('Please submit an article of at least 100 characters for verification.');
  }
  return body;
}
