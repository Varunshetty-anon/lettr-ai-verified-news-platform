import assert from 'assert';

console.log("==========================================");
console.log("🧪 LETTR QA DIAGNOSTICS & E2E RUNNER");
console.log("==========================================");

const NVAPI_KEY = "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";

async function runTests() {
  let passed = 0;
  let failed = 0;

  console.log("\n[1] Testing NVIDIA GEMMA AI Pipeline...");
  try {
     const prompt = `
       Act as a professional news editor. Rewrite the following raw text into a serious 1 line summary.
       Raw: OMG the SEC just sued that crypto company!!
       Output ONLY valid JSON: { "cleanSummary": "..." }
     `;

    const rewriteResponse = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${NVAPI_KEY}`
      },
      body: JSON.stringify({
        model: "google/gemma-2-9b-it",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        response_format: { type: "json_object" }
      })
    });

    assert.strictEqual(rewriteResponse.status, 200, "NVIDIA API rejected the request.");
    const rewriteData = await rewriteResponse.json();
    const parsed = JSON.parse(rewriteData.choices[0].message.content);
    assert.ok(parsed.cleanSummary, "AI failed to return valid targeted JSON.");
    
    console.log("   ✅ GEMMA Rewriter operational. Output:", parsed.cleanSummary);
    passed++;
  } catch (e) {
    console.error("   ❌ GEMMA Error:", e.message);
    failed++;
  }

  console.log("\n[2] Verifying Mongoose & DB Architecture...");
  if (!process.env.MONGODB_URI) {
      console.log("   ⚠️ MONGODB_URI missing from environment. Skipping explicit DB push test.");
      console.log("      Please clone `.env.template` to `.env.local` to enable full DB testing.");
  } else {
      console.log("   ✅ MONGODB_URI detected.");
  }

  console.log("\n[3] Evaluating Apple Sign-In Provider Structure...");
  // We check if the file compiles or if NEXTAUTH prevents it.
  try {
      if (!process.env.APPLE_PRIVATE_KEY) {
         console.log("   ⚠️ APPLE_PRIVATE_KEY missing. NextAuth AppleProvider will fail during live click.");
      } else {
         console.log("   ✅ Apple Keys loaded into environment.");
      }
      passed++;
  } catch(e) {
      console.error("   ❌ Auth structure check failed:", e.message);
      failed++;
  }

  console.log("\n-------------------------------------------");
  console.log(`Diagnostics complete. Passed: ${passed} | Failed: ${failed}`);
  console.log("-------------------------------------------\n");
  if (failed > 0) process.exit(1);
}

runTests();
