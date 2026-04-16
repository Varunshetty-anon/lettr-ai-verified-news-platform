import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runDiagnostics() {
  console.log("==================================================");
  console.log("🚀 LETTR LIVE ENVIRONMENT DIAGNOSTICS");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  console.log("\n[1] Testing MongoDB Cluster Connection...");
  try {
     const uri = process.env.MONGODB_URI;
     if (!uri) throw new Error("Missing MONGODB_URI");

     await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
     console.log("   ✅ MongoDB Connection SUCCESSFUL! Engine is secured.");
     mongoose.disconnect();
     passed++;
  } catch (e) {
     console.error("   ❌ MongoDB Connection FAILED:", e.message);
     failed++;
  }

  console.log("\n[2] Testing Groq AI Engine (Mixtral-8x7b-32768)...");
  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Missing GROQ_API_KEY");

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: "Format:\nScore: 99\nReason: Test" }],
        temperature: 0.1
      })
    });

    if (response.ok) {
        const data = await response.json();
        console.log("   ✅ Groq Engine online & parsing successfully.", data.choices[0]?.message.content.substring(0, 40));
        passed++;
    } else {
        throw new Error(`Rejected with status: ${response.status}`);
    }
  } catch (e) {
     console.error("   ❌ AI Engine FAILED:", e.message);
     failed++;
  }

  console.log("\n[3] Checking External Strings...");
  if (process.env.GOOGLE_CLIENT_SECRET && process.env.SUPABASE_ANON_KEY) {
     console.log("   ✅ OAuth & Supabase Keys are locked and loaded.");
     passed++;
  } else {
     console.log("   ❌ Missing OAuth / Supabase keys.");
     failed++;
  }

  console.log("\n--------------------------------------------------");
  console.log(`Diagnostics Result: Passed: ${passed} | Failed: ${failed}`);
  console.log("--------------------------------------------------\n");
  
  process.exit(failed > 0 ? 1 : 0);
}

runDiagnostics();
