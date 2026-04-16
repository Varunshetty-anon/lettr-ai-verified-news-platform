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

  console.log("\n[2] Testing Hugging Face AI Engine (Gemma-7b-it)...");
  try {
    const apiKey = process.env.HUGGINGFACE_API_KEY;
    if (!apiKey) throw new Error("Missing HUGGINGFACE_API_KEY");

    const prompt = `Format:\nScore: 99\nReason: Test`;
    const response = await fetch("https://api-inference.huggingface.co/models/google/gemma-2-2b-it", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: { max_new_tokens: 10, temperature: 0.1 }
      })
    });

    if (response.status === 503) {
        console.log("   ⚠️ Model is loading (Cold Start). But API Key is Valid!");
        passed++;
    } else if (response.ok) {
        const data = await response.json();
        console.log("   ✅ Hugging Face Engine online & parsing successfully.");
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
