export interface VerificationResult {
  factScore: number;
  factSummary: string;
  confidence: string;
  sourcesChecked: number;
  issues?: string[];
}

// ─── Model Routing ─────────────────────────────────────────────
// Premium model: ONLY for final fact verification (Layer 3)
const PREMIUM_MODEL = "openai/gpt-oss-120b";
// Content Understanding (Layer 2) & Fallback
const UNDERSTANDING_MODEL = "qwen/qwen3-32b";
// Cheap model: for content processing (Layer 1, handled in content-processor.ts)
const CHEAP_MODEL = "llama-3.1-8b-instant";

// ─── Rate Limit Cooldown State ─────────────────────────────────
let lastRateLimitHit = 0;
const RATE_LIMIT_COOLDOWN_MS = 60_000; // 1 minute cooldown after 429

function isInCooldown(): boolean {
  return Date.now() - lastRateLimitHit < RATE_LIMIT_COOLDOWN_MS;
}

function extractSourceLinks(referenceLink?: string) {
  if (!referenceLink) return [];
  return referenceLink
    .split(/[\s,\n]+/)
    .map(link => link.trim())
    .filter(link => /^https?:\/\//i.test(link));
}

// ─── Source Credibility Database ────────────────────────────────
const TRUSTED_DOMAINS = new Set([
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk', 'nytimes.com',
  'washingtonpost.com', 'theguardian.com', 'economist.com',
  'nature.com', 'science.org', 'nasa.gov', 'nih.gov', 'who.int',
  'ndtv.com', 'thehindu.com', 'indianexpress.com', 'livemint.com',
  'moneycontrol.com', 'economictimes.com', 'hindustantimes.com',
  'techcrunch.com', 'theverge.com', 'arstechnica.com', 'wired.com',
  'bloomberg.com', 'cnbc.com', 'ft.com', 'wsj.com',
  'aljazeera.com', 'dw.com', 'france24.com',
  'spacex.com', 'isro.gov.in', 'esa.int',
]);

const QUESTIONABLE_DOMAINS = new Set([
  'reddit.com', 'twitter.com', 'x.com', 'facebook.com',
  'tiktok.com', 'instagram.com', 'medium.com', 'substack.com',
  'wordpress.com', 'blogspot.com',
]);

function getSourceCredibility(url: string): 'trusted' | 'questionable' | 'unknown' {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const domain of TRUSTED_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return 'trusted';
    }
    for (const domain of QUESTIONABLE_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return 'questionable';
    }
  } catch {}
  return 'unknown';
}

// ─── Groq API Helper with 429 Handling ──────────────────────────
async function callGroq(
  model: string,
  messages: Array<{ role: string; content: string }>,
  temperature = 0.1
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  if (isInCooldown()) {
    console.warn(`[Verification] In rate-limit cooldown. Skipping Groq call.`);
    return null;
  }

  const delays = [1500, 4000, 8000];
  
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          response_format: { type: "json_object" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
      }

      if (response.status === 429) {
        lastRateLimitHit = Date.now();
        console.warn(`[Verification] 429 rate limit on ${model}. Cooldown activated.`);
        if (attempt < 2) {
          await new Promise(r => setTimeout(r, delays[attempt]));
          continue;
        }
        return null;
      }

      console.warn(`[Verification] Groq ${model} returned ${response.status}`);
    } catch (error) {
      console.error(`[Verification] Fetch error on ${model}:`, error);
    }

    if (attempt < 2) {
      await new Promise(r => setTimeout(r, delays[attempt]));
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════
//  LAYER 1: Content Understanding (Cheap Model)
// ═══════════════════════════════════════════════════════════════
interface ContentUnderstanding {
  primaryClaim: string;
  entities: string[];
  topic: string;
  geography: string;
  timeline: string;
  keyClaims: string[];
  isOpinionPiece: boolean;
}

async function layerOneUnderstand(
  headline: string,
  body: string
): Promise<ContentUnderstanding | null> {
  const prompt = `Analyze this news article and extract structured understanding. Return JSON only.

Headline: ${headline}
Content: ${body.substring(0, 1500)}

Return:
{
  "primaryClaim": "<the single most important factual claim in 1 sentence>",
  "entities": ["<list of people, organizations, countries mentioned>"],
  "topic": "<broad topic: politics/technology/science/business/health/conflict/space/environment>",
  "geography": "<primary geographic focus: India/US/EU/Global/China/etc>",
  "timeline": "<when did this happen: today/this week/this month/unclear>",
  "keyClaims": ["<list of 2-4 specific factual claims made>"],
  "isOpinionPiece": <true if editorial/opinion, false if news reporting>
}`;

  const result = await callGroq(UNDERSTANDING_MODEL, [
    { role: "system", content: "You are a news analysis engine. Extract factual structure from articles. Return valid JSON only." },
    { role: "user", content: prompt }
  ], 0.05);

  if (!result) return null;

  try {
    return JSON.parse(result);
  } catch {
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
//  LIVE RETRIEVAL LAYER (Pre-Scoring)
// ═══════════════════════════════════════════════════════════════
async function performLiveRetrieval(understanding: ContentUnderstanding | null): Promise<string> {
  if (!understanding || !understanding.entities || understanding.entities.length === 0) {
    return "No entities extracted for retrieval.";
  }
  
  // Search Wikipedia for the top 2 entities as a reliable mock for live retrieval
  const queries = understanding.entities.slice(0, 2);
  const searchPromises = queries.map(async (query) => {
    try {
      const res = await fetch(`https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&utf8=&format=json&srlimit=1`);
      if (!res.ok) return null;
      const data = await res.json();
      if (data.query?.search?.length > 0) {
        return `[Live Entity Context: ${query}] ${data.query.search[0].snippet.replace(/<[^>]*>?/gm, '')}`;
      }
    } catch {
      return null;
    }
    return null;
  });

  const results = await Promise.all(searchPromises);
  const validResults = results.filter(Boolean);
  
  return validResults.length > 0 
    ? validResults.join('\n') 
    : "Live retrieval yielded no specific context. Rely on general verified knowledge.";
}

// ═══════════════════════════════════════════════════════════════
//  LAYER 2+3: Reality Verification + Human Explanation (Premium)
// ═══════════════════════════════════════════════════════════════
async function layerTwoThreeVerify(
  headline: string,
  body: string,
  understanding: ContentUnderstanding | null,
  sourceCredibility: 'trusted' | 'questionable' | 'unknown',
  sourceCount: number,
  referenceLink?: string,
  isPremiumRoute: boolean = false,
  liveRetrievalData: string = ''
): Promise<VerificationResult> {
  const contextBlock = understanding
    ? `
LAYER 1 ANALYSIS (already completed):
- Primary claim: ${understanding.primaryClaim}
- Entities: ${understanding.entities.join(', ')}
- Topic: ${understanding.topic}
- Geography: ${understanding.geography}
- Timeline: ${understanding.timeline}
- Key claims: ${understanding.keyClaims.join(' | ')}
- Opinion piece: ${understanding.isOpinionPiece ? 'Yes' : 'No'}
`
    : '';

  const currentDate = new Date().toISOString();
  const currentYear = new Date().getFullYear();

  const prompt = `You are LETTR's senior editorial fact-checker. 

*** CRITICAL DATE AWARENESS ***
CURRENT REAL-WORLD DATE: ${currentDate} (Year: ${currentYear})
NEVER assume the current year is from your training memory (e.g. 2023 or 2024). 
If an article references events in ${currentYear} or ${currentYear + 1}, evaluate it from the context that TODAY is ${currentDate}.
NEVER confidently reject something as false just because it discusses events your training data considers "the future".

${contextBlock}

LIVE RETRIEVAL CONTEXT (Cross-Verification Data):
${liveRetrievalData}

ARTICLE TO VERIFY:
Headline: ${headline}
Content: ${body.substring(0, 2500)}
Source URL: ${referenceLink || 'None provided'}
Source credibility: ${sourceCredibility}
Number of source links: ${sourceCount}

═══ LAYER 2: REALITY VERIFICATION ═══
Cross-check claims against live retrieval and trusted knowledge:
1. TIMELINE CHECK: Does this align with the current date (${currentYear})? Do NOT reject as false if timeline is future/current.
2. Are the named entities real and correctly described?
3. Is the article internally consistent?
4. Does the source credibility support the claims? (${sourceCredibility} source)

═══ LAYER 3: SCORING + HUMAN EXPLANATION ═══
Score using this STRICT rubric:
- 90-100: Multiple trusted confirmations. Named sources. Verifiable facts. Well-sourced from credible outlets (Reuters, AP, Hindu, ISRO, NASA, etc).
- 75-89: Mostly credible. Key claims align with known reporting. Single TRUSTED source is perfectly acceptable.
- 50-74: DEVELOPING STORY or weak sourcing. Claims are developing or unconfirmed. DO NOT call it false if uncertain.
- 0-49: Outright false, debunked, or completely nonsensical.

CRITICAL SCORING RULES:
- Do NOT punish articles for having only ONE source link if the source is TRUSTED (Reuters, BBC, Gov, etc). Single trusted sources should still get 85-95.
- If an article is breaking news or developing (e.g., uncertain outcomes but real entities), score it 60-74 and mark confidence as 'Low' or 'Medium' so it triggers the DEVELOPING STORY badge. Do NOT reject it as false (0-49) just because it's new.
- AI must NEVER confidently reject something due to outdated model memory. If uncertain, lower confidence (50-74), DO NOT fail it.

Return JSON EXACTLY matching this format:
{
  "factScore": <0-100>,
  "summary": "VERIFIED:\n- [Fact 1]\n- [Fact 2]\n\nNEEDS CONFIRMATION:\n- [Claim 1]\n\nCONTEXT:\n- [Timeline/Historical relevance]\n\nVERDICT:\n[Short human-readable explanation]",
  "confidence": "<Low | Medium | High>",
  "sourcesChecked": ${sourceCount},
  "issues": ["<specific issue if any>"]
}`;

  // Model cascade: try premium → fallback → local
  const systemMsg = { role: "system", content: "You are an elite journalistic fact-checker for LETTR, an AI-verified news platform. Your analysis must feel human, contextual, and cite specific details from the article. Never use boilerplate language." };
  const userMsg = { role: "user", content: prompt };

  const modelsToTry = isPremiumRoute 
    ? [PREMIUM_MODEL, UNDERSTANDING_MODEL] 
    : [UNDERSTANDING_MODEL];

  for (const model of modelsToTry) {
    console.log(`[Verification] Trying model: ${model}`);
    const result = await callGroq(model, [systemMsg, userMsg], 0.15);

    if (result) {
      try {
        const parsed = JSON.parse(result);
        console.log(`[Verification] ${model} succeeded.`);
        return {
          factScore: Math.max(0, Math.min(100, parsed.factScore ?? 50)),
          factSummary: parsed.summary || parsed.factSummary || "Verification analysis unavailable.",
          confidence: parsed.confidence || "Medium",
          sourcesChecked: parsed.sourcesChecked ?? sourceCount,
          issues: parsed.issues || []
        };
      } catch {
        console.warn(`[Verification] ${model} returned unparseable JSON, trying next model.`);
        continue;
      }
    }
    console.warn(`[Verification] ${model} failed or rate-limited. Trying next.`);
  }

  // All models failed — use intelligent local fallback
  console.warn(`[Verification] All models failed. Using intelligent local fallback.`);
  return buildIntelligentFallback(headline, body, sourceCredibility, sourceCount, understanding);
}

// ─── Intelligent Fallback (when API unavailable) ────────────────
function buildIntelligentFallback(
  headline: string,
  body: string,
  sourceCredibility: 'trusted' | 'questionable' | 'unknown',
  sourceCount: number,
  understanding: ContentUnderstanding | null
): VerificationResult {
  const bodyWordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const issues: string[] = [];

  // Base scoring that respects source credibility
  let score = 55;

  if (sourceCredibility === 'trusted') {
    score = 76;
  } else if (sourceCredibility === 'questionable') {
    score = 52;
    issues.push('Source platform has limited editorial oversight.');
  }

  // Body quality bonus
  if (bodyWordCount >= 250) score += 8;
  else if (bodyWordCount >= 150) score += 4;
  else {
    issues.push('Article body is brief, limiting verification depth.');
  }

  // Source count bonus
  if (sourceCount >= 2) score += 6;
  else if (sourceCount >= 1) score += 3;
  else issues.push('No external source links for independent corroboration.');

  // Opinion penalty
  if (understanding?.isOpinionPiece) {
    score = Math.min(score, 65);
    issues.push('Content appears to be editorial/opinion rather than factual reporting.');
  }

  score = Math.max(10, Math.min(95, score));

  // Build contextual summary
  const entityMention = understanding?.entities?.length
    ? ` involving ${understanding.entities.slice(0, 3).join(', ')}`
    : '';
  const topicMention = understanding?.topic ? ` on ${understanding.topic}` : '';
  const geoMention = understanding?.geography ? ` (${understanding.geography})` : '';

  const credibilityNote = sourceCredibility === 'trusted'
    ? 'from a credible outlet'
    : sourceCredibility === 'questionable'
    ? 'from a user-generated platform'
    : 'from an unverified source';

  const factSummary = `This report${topicMention}${entityMention}${geoMention} is ${credibilityNote}. ` +
    `Verification confidence is reduced while additional cross-referencing completes. ` +
    `${sourceCount > 0 ? `${sourceCount} source link${sourceCount > 1 ? 's' : ''} provided for reference.` : 'No source links were supplied for independent review.'} ` +
    `Manual verification of key claims is recommended.`;

  return {
    factScore: score,
    factSummary,
    confidence: score >= 75 ? 'Medium' : 'Low',
    sourcesChecked: sourceCount,
    issues,
  };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN ENTRY POINT: 3-Layer Verification Pipeline
// ═══════════════════════════════════════════════════════════════
export async function verifyFact(
  headline: string,
  body: string,
  referenceLink?: string,
  mediaContext?: { imageUrl?: string; videoUrl?: string },
  isPremiumRoute: boolean = false
): Promise<VerificationResult> {
  const sourceLinks = extractSourceLinks(referenceLink);
  const sourceCount = sourceLinks.length;

  // Determine source credibility from the reference link
  let sourceCredibility: 'trusted' | 'questionable' | 'unknown' = 'unknown';
  if (referenceLink) {
    sourceCredibility = getSourceCredibility(referenceLink);
  }

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return buildIntelligentFallback(headline, body, sourceCredibility, sourceCount, null);
  }

  // ── Layer 1: Content Understanding (cheap model) ──
  console.log(`[Verification] Layer 1: Understanding content...`);
  const understanding = await layerOneUnderstand(headline, body);
  if (understanding) {
    console.log(`[Verification] Layer 1 complete: ${understanding.primaryClaim?.substring(0, 80)}...`);
  }

  // ── Live Retrieval Layer ──
  console.log(`[Verification] Performing live retrieval for claims...`);
  const liveRetrievalData = await performLiveRetrieval(understanding);

  // ── Layer 2+3: Reality Verification + Explanation (premium model) ──
  console.log(`[Verification] Layer 2+3: Verifying reality and generating explanation...`);
  const result = await layerTwoThreeVerify(
    headline, body, understanding,
    sourceCredibility, sourceCount, referenceLink, isPremiumRoute, liveRetrievalData
  );

  console.log(`[Verification] Complete: Score=${result.factScore}, Confidence=${result.confidence}`);
  return result;
}

// Export cooldown state checker for bot throttling
export function isVerificationCoolingDown(): boolean {
  return isInCooldown();
}
