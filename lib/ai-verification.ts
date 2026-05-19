export interface VerificationResult {
  factScore: number;
  factSummary: string;
  confidence: string;
  sourcesChecked: number;
  issues?: string[];
}

// ─── Model Routing ─────────────────────────────────────────────
const PREMIUM_MODEL = "openai/gpt-oss-120b";
const UNDERSTANDING_MODEL = "qwen/qwen3-32b";
const CHEAP_MODEL = "llama-3.1-8b-instant";

// ─── Rate Limit Cooldown State ─────────────────────────────────
let lastRateLimitHit = 0;
const RATE_LIMIT_COOLDOWN_MS = 60_000;

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
const TIER1_DOMAINS = new Set([
  'reuters.com', 'apnews.com', 'bbc.com', 'bbc.co.uk',
  'nasa.gov', 'nih.gov', 'who.int', 'isro.gov.in', 'esa.int',
  'gov.in', 'nic.in', 'pib.gov.in',
  'bloomberg.com', 'nytimes.com', 'washingtonpost.com',
  'theguardian.com', 'economist.com', 'nature.com', 'science.org',
]);

const TIER2_DOMAINS = new Set([
  'thehindu.com', 'indianexpress.com', 'ndtv.com', 'livemint.com',
  'economictimes.com', 'hindustantimes.com', 'moneycontrol.com',
  'techcrunch.com', 'theverge.com', 'arstechnica.com', 'wired.com',
  'cnbc.com', 'ft.com', 'wsj.com',
  'aljazeera.com', 'dw.com', 'france24.com',
  'spacex.com',
]);

const QUESTIONABLE_DOMAINS = new Set([
  'reddit.com', 'twitter.com', 'x.com', 'facebook.com',
  'tiktok.com', 'instagram.com', 'medium.com', 'substack.com',
  'wordpress.com', 'blogspot.com',
]);

function getSourceCredibility(url: string): 'tier1' | 'tier2' | 'questionable' | 'unknown' {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const domain of TIER1_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return 'tier1';
    }
    for (const domain of TIER2_DOMAINS) {
      if (hostname === domain || hostname.endsWith('.' + domain)) return 'tier2';
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
//  LIVE RETRIEVAL ENGINE
//  Multi-source, tiered retrieval for real-time cross-verification
// ═══════════════════════════════════════════════════════════════
interface RetrievalResult {
  source: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  title: string;
  snippet: string;
  publishDate?: string;
}

async function performLiveRetrieval(
  understanding: ContentUnderstanding | null,
  headline: string
): Promise<{ results: RetrievalResult[]; summary: string }> {
  if (!understanding) {
    return { results: [], summary: "No structured understanding available for retrieval." };
  }

  const searchQuery = buildSearchQuery(understanding, headline);
  console.log(`[Retrieval] Search query: "${searchQuery}"`);

  // Run all retrieval sources in parallel
  const [googleNewsResults, wikiResults] = await Promise.all([
    retrieveFromGoogleNews(searchQuery, understanding),
    retrieveFromWikipedia(understanding.entities.slice(0, 2)),
  ]);

  const allResults = [...googleNewsResults, ...wikiResults];
  
  console.log(`[Retrieval] Found ${allResults.length} cross-references (${googleNewsResults.length} news, ${wikiResults.length} wiki)`);

  // Build structured summary for the LLM
  const summary = buildRetrievalSummary(allResults, understanding);

  return { results: allResults, summary };
}

function buildSearchQuery(understanding: ContentUnderstanding, headline: string): string {
  // Build a focused search query from the most important elements
  const parts: string[] = [];
  
  // Use top 2 entities
  if (understanding.entities?.length > 0) {
    parts.push(...understanding.entities.slice(0, 2));
  }
  
  // Add geography if specific
  if (understanding.geography && understanding.geography !== 'Global') {
    parts.push(understanding.geography);
  }
  
  // Add topic keyword
  if (understanding.topic) {
    parts.push(understanding.topic);
  }

  // Fallback to headline keywords if entities are empty
  if (parts.length === 0) {
    return headline.split(/\s+/).slice(0, 5).join(' ');
  }

  return parts.join(' ');
}

// ─── Google News RSS (Tier 1 + Tier 2 real-time news) ──────────
async function retrieveFromGoogleNews(
  query: string,
  understanding: ContentUnderstanding
): Promise<RetrievalResult[]> {
  const results: RetrievalResult[] = [];
  
  try {
    const encodedQuery = encodeURIComponent(query);
    // Use India-focused news for Indian geography, global otherwise
    const isIndian = ['India', 'Karnataka', 'Maharashtra', 'Delhi', 'Tamil Nadu', 'Kerala', 'Gujarat', 'Mumbai', 'Bangalore', 'Chennai', 'Hyderabad']
      .some(g => understanding.geography?.includes(g) || query.includes(g));
    
    const hl = isIndian ? 'en-IN' : 'en-US';
    const gl = isIndian ? 'IN' : 'US';
    const ceid = isIndian ? 'IN:en' : 'US:en';
    
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${hl}&gl=${gl}&ceid=${ceid}`;
    
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Lettr/1.0 NewsVerifier' },
      signal: AbortSignal.timeout(8000),
    });
    
    if (!response.ok) {
      console.warn(`[Retrieval] Google News returned ${response.status}`);
      return results;
    }

    const xml = await response.text();
    
    // Parse RSS XML for items
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;
    let count = 0;
    
    while ((match = itemRegex.exec(xml)) !== null && count < 5) {
      const itemXml = match[1];
      
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/);
      
      const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
      const pubDate = pubDateMatch?.[1] || '';
      const source = (sourceMatch?.[1] || '').trim();
      
      // Extract source name from description HTML if not in source tag
      let sourceName = source;
      if (!sourceName && descMatch) {
        const descHtml = descMatch[1] || descMatch[2] || '';
        const fontMatch = descHtml.match(/<font[^>]*>(.*?)<\/font>/);
        if (fontMatch) sourceName = fontMatch[1].trim();
      }
      
      // Also extract the actual article title from description if title includes source
      let cleanTitle = title;
      if (title.includes(' - ') && sourceName) {
        cleanTitle = title.replace(` - ${sourceName}`, '').trim();
      }
      
      if (cleanTitle) {
        // Determine tier based on source name
        const tier = determineTier(sourceName);
        
        results.push({
          source: sourceName || 'Google News',
          tier,
          title: cleanTitle,
          snippet: `Published: ${pubDate}. Source: ${sourceName}.`,
          publishDate: pubDate,
        });
        count++;
      }
    }
  } catch (error) {
    console.warn(`[Retrieval] Google News fetch failed:`, error);
  }
  
  return results;
}

function determineTier(sourceName: string): 'tier1' | 'tier2' | 'tier3' {
  const name = sourceName.toLowerCase();
  
  const tier1Sources = ['reuters', 'ap news', 'associated press', 'bbc', 'bloomberg', 'nasa', 'isro', 'who', 'un news', 'nytimes', 'new york times', 'washington post', 'guardian', 'nature', 'science'];
  const tier2Sources = ['the hindu', 'indian express', 'ndtv', 'economic times', 'hindustan times', 'livemint', 'techcrunch', 'the verge', 'wired', 'ars technica', 'cnbc', 'financial times', 'wsj', 'wall street journal', 'al jazeera', 'dw', 'france24', 'times of india', 'ani', 'etv bharat', 'moneycontrol', 'mint'];
  
  if (tier1Sources.some(s => name.includes(s))) return 'tier1';
  if (tier2Sources.some(s => name.includes(s))) return 'tier2';
  return 'tier3';
}

// ─── Wikipedia (Tier 3: background entity context) ──────────────
async function retrieveFromWikipedia(entities: string[]): Promise<RetrievalResult[]> {
  const results: RetrievalResult[] = [];
  
  const promises = entities.map(async (entity) => {
    try {
      const res = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(entity)}&utf8=&format=json&srlimit=1`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (!res.ok) return null;
      const data = await res.json();
      if (data.query?.search?.length > 0) {
        const snippet = data.query.search[0].snippet.replace(/<[^>]*>?/gm, '');
        return {
          source: 'Wikipedia',
          tier: 'tier3' as const,
          title: data.query.search[0].title,
          snippet: snippet,
        };
      }
    } catch {
      return null;
    }
    return null;
  });

  const resolved = await Promise.all(promises);
  for (const r of resolved) {
    if (r) results.push(r);
  }
  
  return results;
}

// ─── Build structured retrieval summary for LLM ────────────────
function buildRetrievalSummary(results: RetrievalResult[], understanding: ContentUnderstanding): string {
  if (results.length === 0) {
    return "LIVE RETRIEVAL: No matching coverage found. This may be a very recent or developing story. Score conservatively but do NOT mark as false.";
  }

  const tier1 = results.filter(r => r.tier === 'tier1');
  const tier2 = results.filter(r => r.tier === 'tier2');
  const tier3 = results.filter(r => r.tier === 'tier3');
  
  let summary = 'LIVE RETRIEVAL RESULTS:\n';
  
  if (tier1.length > 0) {
    summary += '\n[TIER 1 — Confirmed by top-tier sources]\n';
    tier1.forEach(r => {
      summary += `• ${r.source}: "${r.title}" ${r.publishDate ? `(${r.publishDate})` : ''}\n`;
    });
  }
  
  if (tier2.length > 0) {
    summary += '\n[TIER 2 — Reported by credible outlets]\n';
    tier2.forEach(r => {
      summary += `• ${r.source}: "${r.title}" ${r.publishDate ? `(${r.publishDate})` : ''}\n`;
    });
  }
  
  if (tier3.length > 0) {
    summary += '\n[TIER 3 — Background context]\n';
    tier3.forEach(r => {
      summary += `• ${r.source}: ${r.snippet.substring(0, 120)}\n`;
    });
  }

  // Add retrieval confidence signal
  const confirmedCount = tier1.length + tier2.length;
  if (confirmedCount >= 3) {
    summary += '\n→ RETRIEVAL SIGNAL: Strong corroboration. Multiple independent outlets report similar story.';
  } else if (confirmedCount >= 1) {
    summary += '\n→ RETRIEVAL SIGNAL: Partial corroboration. At least one credible outlet covers this topic.';
  } else {
    summary += '\n→ RETRIEVAL SIGNAL: No direct corroboration from news outlets. Only background context available. Treat as DEVELOPING.';
  }

  return summary;
}

// ═══════════════════════════════════════════════════════════════
//  LAYER 2+3: Reality Verification + Editorial Explanation
// ═══════════════════════════════════════════════════════════════
async function layerTwoThreeVerify(
  headline: string,
  body: string,
  understanding: ContentUnderstanding | null,
  sourceCredibility: 'tier1' | 'tier2' | 'questionable' | 'unknown',
  sourceCount: number,
  retrievalSummary: string,
  referenceLink?: string,
  isPremiumRoute: boolean = false,
): Promise<VerificationResult> {
  const contextBlock = understanding
    ? `
LAYER 1 ANALYSIS:
- Primary claim: ${understanding.primaryClaim}
- Entities: ${understanding.entities.join(', ')}
- Topic: ${understanding.topic}
- Geography: ${understanding.geography}
- Timeline: ${understanding.timeline}
- Key claims: ${understanding.keyClaims.join(' | ')}
- Opinion piece: ${understanding.isOpinionPiece ? 'Yes' : 'No'}
`
    : '';

  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentYear = now.getFullYear();

  const credLabel = sourceCredibility === 'tier1' ? 'TIER 1 TRUSTED'
    : sourceCredibility === 'tier2' ? 'TIER 2 CREDIBLE'
    : sourceCredibility === 'questionable' ? 'USER-GENERATED PLATFORM'
    : 'UNKNOWN';

  const prompt = `You are LETTR's senior editorial fact-checker. You write like a human editor at Reuters or The Hindu.

TODAY'S DATE: ${currentDate} (Year: ${currentYear})
RULE: NEVER reject an article as false because your training data doesn't cover ${currentYear}. The live retrieval data below IS your evidence.

${contextBlock}

${retrievalSummary}

ARTICLE TO VERIFY:
Headline: ${headline}
Content: ${body.substring(0, 2000)}
Source URL: ${referenceLink || 'None provided'}
Source trust level: ${credLabel}

SCORING RULES:
- 90-100: Confirmed by multiple Tier 1/2 sources in live retrieval. Named entities verified. No contradictions.
- 85-89: Single TRUSTED source (Tier 1 or Tier 2) is sufficient. Do NOT penalize for single sourcing if source is credible.
- 75-84: Credible but limited corroboration. Topic is real but specific claims only partially verified.
- 60-74: DEVELOPING STORY. Real entities and plausible claims but insufficient live confirmation. Use confidence "Low" or "Medium".
- 50-59: Weak. Minimal sourcing. Claims are vague or unattributable.
- 0-49: ONLY for outright fabrication, debunked claims, or complete nonsense.

CRITICAL:
- If source is ${credLabel} and no contradictions found in retrieval: minimum score 85.
- If retrieval found NO coverage but entities are real: score 60-74 as DEVELOPING, NOT false.
- NEVER claim "reported by multiple outlets" unless retrieval actually found them.
- NEVER use phrases like "automated assessment" or "appears mostly factual".

Write your response as a CONCISE editorial fact-check (MAX 100 words total in summary).

Return JSON:
{
  "factScore": <0-100>,
  "summary": "✓ Verified\\n- [confirmed fact, max 8 words]\\n- [confirmed fact]\\n\\n⚠ Needs Confirmation\\n- [unverified claim]\\n\\n🧠 Context\\n- [1 sentence of timeline/relevance]\\n\\nVerdict: [1 concise editorial sentence]",
  "confidence": "<Low | Medium | High>",
  "sourcesChecked": <number of retrieval results that matched>,
  "issues": ["<specific issue if any>"]
}`;

  const systemMsg = { role: "system", content: "You are a concise, precise editorial fact-checker. Your output must feel like a premium news intelligence system — never robotic, never verbose. Max 100 words in summary." };
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
  sourceCredibility: 'tier1' | 'tier2' | 'questionable' | 'unknown',
  sourceCount: number,
  understanding: ContentUnderstanding | null
): VerificationResult {
  const bodyWordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const issues: string[] = [];

  let score = 55;

  if (sourceCredibility === 'tier1') {
    score = 85;
  } else if (sourceCredibility === 'tier2') {
    score = 78;
  } else if (sourceCredibility === 'questionable') {
    score = 52;
    issues.push('Source platform has limited editorial oversight.');
  }

  if (bodyWordCount >= 250) score += 5;
  else if (bodyWordCount >= 150) score += 3;
  else issues.push('Article body is brief.');

  if (sourceCount >= 2) score += 4;
  else if (sourceCount >= 1) score += 2;
  else issues.push('No external source links provided.');

  if (understanding?.isOpinionPiece) {
    score = Math.min(score, 65);
    issues.push('Content is editorial/opinion.');
  }

  score = Math.max(10, Math.min(95, score));

  const entities = understanding?.entities?.slice(0, 3).join(', ') || 'unnamed entities';
  const topic = understanding?.topic || 'general news';
  const geo = understanding?.geography || '';

  const factSummary = `✓ Verified\n- Entities identified: ${entities}\n\n⚠ Needs Confirmation\n- AI verification unavailable; manual review recommended\n\n🧠 Context\n- ${topic} report${geo ? ` (${geo})` : ''}, ${sourceCredibility} source\n\nVerdict: Fact-check engine was unavailable. Score based on source credibility and content quality signals.`;

  return {
    factScore: score,
    factSummary,
    confidence: score >= 80 ? 'Medium' : 'Low',
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
  let sourceCredibility: 'tier1' | 'tier2' | 'questionable' | 'unknown' = 'unknown';
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

  // ── Live Retrieval Engine ──
  console.log(`[Verification] Live Retrieval: Searching trusted news sources...`);
  const retrieval = await performLiveRetrieval(understanding, headline);
  console.log(`[Verification] Retrieval complete: ${retrieval.results.length} results found`);

  // ── Layer 2+3: Reality Verification + Explanation ──
  console.log(`[Verification] Layer 2+3: Verifying with live context...`);
  const result = await layerTwoThreeVerify(
    headline, body, understanding,
    sourceCredibility, sourceCount, retrieval.summary, referenceLink, isPremiumRoute
  );

  console.log(`[Verification] Complete: Score=${result.factScore}, Confidence=${result.confidence}`);
  return result;
}

// Export cooldown state checker for bot throttling
export function isVerificationCoolingDown(): boolean {
  return isInCooldown();
}
