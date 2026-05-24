export interface VerificationResult {
  factScore: number;
  factSummary: string;
  confidence: string;
  sourcesChecked: number;
  issues?: string[];
  verificationStatus?: 'CONFIRMED' | 'LIKELY' | 'UNVERIFIED' | 'DEVELOPING';
}

// ─── Model Routing ─────────────────────────────────────────────
const PREMIUM_MODEL = "openai/gpt-oss-120b";
const UNDERSTANDING_MODEL = "qwen/qwen3-32b";

// ─── Rate Limit Cooldown State ─────────────────────────────────
let lastRateLimitHit = 0;
const RATE_LIMIT_COOLDOWN_MS = 60_000;
function isInCooldown(): boolean { return Date.now() - lastRateLimitHit < RATE_LIMIT_COOLDOWN_MS; }

function extractSourceLinks(referenceLink?: string) {
  if (!referenceLink) return [];
  return referenceLink.split(/[\s,\n]+/).map(l => l.trim()).filter(l => /^https?:\/\//i.test(l));
}

// ─── Source Credibility Database ────────────────────────────────
const TIER1_DOMAINS = new Set([
  'reuters.com','apnews.com','bbc.com','bbc.co.uk',
  'nasa.gov','nih.gov','who.int','isro.gov.in','esa.int',
  'gov.in','nic.in','pib.gov.in',
  'bloomberg.com','nytimes.com','washingtonpost.com',
  'theguardian.com','economist.com','nature.com','science.org',
]);
const TIER2_DOMAINS = new Set([
  'thehindu.com','indianexpress.com','ndtv.com','livemint.com',
  'economictimes.com','hindustantimes.com','moneycontrol.com',
  'techcrunch.com','theverge.com','arstechnica.com','wired.com',
  'cnbc.com','ft.com','wsj.com','aljazeera.com','dw.com','france24.com','spacex.com',
]);
const QUESTIONABLE_DOMAINS = new Set([
  'reddit.com','twitter.com','x.com','facebook.com',
  'tiktok.com','instagram.com','medium.com','substack.com',
  'wordpress.com','blogspot.com',
]);

function getSourceCredibility(url: string): 'tier1' | 'tier2' | 'questionable' | 'unknown' {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '');
    for (const d of TIER1_DOMAINS) { if (hostname === d || hostname.endsWith('.' + d)) return 'tier1'; }
    for (const d of TIER2_DOMAINS) { if (hostname === d || hostname.endsWith('.' + d)) return 'tier2'; }
    for (const d of QUESTIONABLE_DOMAINS) { if (hostname === d || hostname.endsWith('.' + d)) return 'questionable'; }
  } catch {}
  return 'unknown';
}

// ─── Groq API Helper ───────────────────────────────────────────
async function callGroq(
  model: string, messages: Array<{ role: string; content: string }>, temperature = 0.1
): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (isInCooldown()) { console.warn(`[Verification] In cooldown.`); return null; }

  const delays = [1500, 4000, 8000];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages, temperature, response_format: { type: "json_object" } })
      });
      if (response.ok) {
        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
      }
      if (response.status === 429) {
        lastRateLimitHit = Date.now();
        if (attempt < 2) { await new Promise(r => setTimeout(r, delays[attempt])); continue; }
        return null;
      }
      console.warn(`[Verification] Groq ${model} returned ${response.status}`);
    } catch (error) {
      console.error(`[Verification] Fetch error on ${model}:`, error);
    }
    if (attempt < 2) await new Promise(r => setTimeout(r, delays[attempt]));
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════
//  LAYER 1: Deep Content Understanding
// ═══════════════════════════════════════════════════════════════
interface ContentUnderstanding {
  primaryClaim: string;
  entities: string[];
  people: string[];
  organizations: string[];
  geography: string;
  timeline: string;
  datesMentioned: string[];
  keyClaims: string[];
  isOpinionPiece: boolean;
  topic: string;
}

async function layerOneUnderstand(headline: string, body: string): Promise<ContentUnderstanding | null> {
  const now = new Date();
  const prompt = `Analyze this news article. Today is ${now.toISOString().split('T')[0]}.

Headline: ${headline}
Content: ${body.substring(0, 1500)}

Return JSON:
{
  "primaryClaim": "<single most important factual claim, 1 sentence>",
  "entities": ["<all named entities>"],
  "people": ["<specific people mentioned by name>"],
  "organizations": ["<orgs, companies, agencies, governments>"],
  "geography": "<primary geographic focus: India/US/EU/Global/etc>",
  "timeline": "<when: today/this_week/this_month/older/unclear>",
  "datesMentioned": ["<any specific dates referenced>"],
  "keyClaims": ["<2-4 specific falsifiable claims>"],
  "isOpinionPiece": <true if editorial/opinion>,
  "topic": "<politics/technology/science/business/health/conflict/space/environment>"
}`;

  const result = await callGroq(UNDERSTANDING_MODEL, [
    { role: "system", content: "News analysis engine. Extract factual structure. Return valid JSON only." },
    { role: "user", content: prompt }
  ], 0.05);
  if (!result) return null;
  try { return JSON.parse(result); } catch { return null; }
}

// ═══════════════════════════════════════════════════════════════
//  LIVE RETRIEVAL ENGINE — Multi-source tiered retrieval
// ═══════════════════════════════════════════════════════════════
interface RetrievalResult {
  source: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  title: string;
  snippet: string;
  publishDate?: string;
}

async function performLiveRetrieval(
  understanding: ContentUnderstanding | null, headline: string
): Promise<{ results: RetrievalResult[]; summary: string }> {
  if (!understanding) return { results: [], summary: "No structured understanding available." };

  const searchQuery = buildSearchQuery(understanding, headline);
  console.log(`[Retrieval] Query: "${searchQuery}"`);

  const [googleNewsResults, wikiResults] = await Promise.all([
    retrieveFromGoogleNews(searchQuery, understanding),
    retrieveFromWikipedia(understanding.entities.slice(0, 2)),
  ]);

  const allResults = [...googleNewsResults, ...wikiResults];
  console.log(`[Retrieval] ${allResults.length} refs (${googleNewsResults.length} news, ${wikiResults.length} wiki)`);

  return { results: allResults, summary: buildRetrievalSummary(allResults, understanding) };
}

function buildSearchQuery(understanding: ContentUnderstanding, headline: string): string {
  const parts: string[] = [];
  // Use people + orgs first for precision
  if (understanding.people?.length > 0) parts.push(...understanding.people.slice(0, 2));
  else if (understanding.entities?.length > 0) parts.push(...understanding.entities.slice(0, 2));
  if (understanding.organizations?.length > 0 && parts.length < 3) {
    parts.push(understanding.organizations[0]);
  }
  if (understanding.geography && understanding.geography !== 'Global' && parts.length < 4) {
    parts.push(understanding.geography);
  }
  if (understanding.topic && parts.length < 4) parts.push(understanding.topic);
  if (parts.length === 0) return headline.split(/\s+/).slice(0, 5).join(' ');
  return parts.join(' ');
}

// ─── Google News RSS ────────────────────────────────────────────
async function retrieveFromGoogleNews(
  query: string, understanding: ContentUnderstanding
): Promise<RetrievalResult[]> {
  const results: RetrievalResult[] = [];
  try {
    const encodedQuery = encodeURIComponent(query);
    const isIndian = ['India','Karnataka','Maharashtra','Delhi','Tamil Nadu','Kerala','Gujarat','Mumbai','Bangalore','Chennai','Hyderabad']
      .some(g => understanding.geography?.includes(g) || query.includes(g));
    const hl = isIndian ? 'en-IN' : 'en-US';
    const gl = isIndian ? 'IN' : 'US';
    const ceid = isIndian ? 'IN:en' : 'US:en';
    const url = `https://news.google.com/rss/search?q=${encodedQuery}&hl=${hl}&gl=${gl}&ceid=${ceid}`;

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Lettr/1.0 NewsVerifier' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return results;

    const xml = await response.text();
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match; let count = 0;
    while ((match = itemRegex.exec(xml)) !== null && count < 8) {
      const itemXml = match[1];
      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>/);
      const descMatch = itemXml.match(/<description><!\[CDATA\[(.*?)\]\]>|<description>(.*?)<\/description>/);

      const title = (titleMatch?.[1] || titleMatch?.[2] || '').trim();
      const pubDate = pubDateMatch?.[1] || '';
      let sourceName = (sourceMatch?.[1] || '').trim();
      if (!sourceName && descMatch) {
        const descHtml = descMatch[1] || descMatch[2] || '';
        const fontMatch = descHtml.match(/<font[^>]*>(.*?)<\/font>/);
        if (fontMatch) sourceName = fontMatch[1].trim();
      }
      let cleanTitle = title;
      if (title.includes(' - ') && sourceName) cleanTitle = title.replace(` - ${sourceName}`, '').trim();

      if (cleanTitle) {
        results.push({
          source: sourceName || 'Google News',
          tier: determineTier(sourceName),
          title: cleanTitle,
          snippet: `Published: ${pubDate}. Source: ${sourceName}.`,
          publishDate: pubDate,
        });
        count++;
      }
    }
  } catch (error) {
    console.warn(`[Retrieval] Google News failed:`, error);
  }
  return results;
}

function determineTier(sourceName: string): 'tier1' | 'tier2' | 'tier3' {
  const name = sourceName.toLowerCase();
  const t1 = ['reuters','ap news','associated press','bbc','bloomberg','nasa','isro','who','un news','nytimes','new york times','washington post','guardian','nature','science'];
  const t2 = ['the hindu','indian express','ndtv','economic times','hindustan times','livemint','techcrunch','the verge','wired','ars technica','cnbc','financial times','wsj','wall street journal','al jazeera','dw','france24','times of india','ani','moneycontrol','mint'];
  if (t1.some(s => name.includes(s))) return 'tier1';
  if (t2.some(s => name.includes(s))) return 'tier2';
  return 'tier3';
}

// ─── Wikipedia (Tier 3 background only) ─────────────────────────
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
        return {
          source: 'Wikipedia',
          tier: 'tier3' as const,
          title: data.query.search[0].title,
          snippet: data.query.search[0].snippet.replace(/<[^>]*>?/gm, ''),
        };
      }
    } catch { return null; }
    return null;
  });
  for (const r of await Promise.all(promises)) { if (r) results.push(r); }
  return results;
}

// ─── Time-Aware Retrieval Summary ───────────────────────────────
function buildRetrievalSummary(results: RetrievalResult[], understanding: ContentUnderstanding): string {
  const now = new Date();

  if (results.length === 0) {
    return "LIVE RETRIEVAL: No matching coverage found. This may be a developing story. Do NOT mark as false — score 60-74 as DEVELOPING.";
  }

  const tier1 = results.filter(r => r.tier === 'tier1');
  const tier2 = results.filter(r => r.tier === 'tier2');
  const tier3 = results.filter(r => r.tier === 'tier3');

  // Time analysis on retrieval results
  let recentCount = 0;
  for (const r of [...tier1, ...tier2]) {
    if (r.publishDate) {
      try {
        const pubDate = new Date(r.publishDate);
        const hoursAgo = (now.getTime() - pubDate.getTime()) / (1000 * 60 * 60);
        if (hoursAgo <= 24) recentCount++;
      } catch {}
    }
  }

  let summary = 'LIVE RETRIEVAL RESULTS:\n';

  if (tier1.length > 0) {
    summary += '\n[TIER 1 — Top-tier sources (Reuters/BBC/AP/Bloomberg/Gov)]\n';
    tier1.forEach(r => { summary += `• ${r.source}: "${r.title}" ${r.publishDate ? `(${r.publishDate})` : ''}\n`; });
  }
  if (tier2.length > 0) {
    summary += '\n[TIER 2 — Credible outlets (Hindu/IndianExpress/NDTV/TechCrunch/Verge)]\n';
    tier2.forEach(r => { summary += `• ${r.source}: "${r.title}" ${r.publishDate ? `(${r.publishDate})` : ''}\n`; });
  }
  if (tier3.length > 0) {
    summary += '\n[TIER 3 — Background context only (Wikipedia)]\n';
    tier3.forEach(r => { summary += `• ${r.source}: ${r.snippet.substring(0, 120)}\n`; });
  }

  // Time window analysis
  const timeline = understanding.timeline || 'unclear';
  summary += `\n[TIME ANALYSIS]\n`;
  summary += `• Article timeline claim: ${timeline}\n`;
  summary += `• Server date: ${now.toISOString().split('T')[0]}\n`;
  summary += `• Retrieval results from last 24h: ${recentCount}\n`;

  if (timeline === 'today' || timeline === 'this_week') {
    summary += `• ⚡ BREAKING/RECENT: This story may be developing. Incomplete evidence is expected.\n`;
  }

  // Confidence signal
  const confirmedCount = tier1.length + tier2.length;
  if (confirmedCount >= 3) {
    summary += '\n→ SIGNAL: Strong corroboration from multiple independent outlets. CONFIRMED.';
  } else if (confirmedCount >= 1) {
    summary += '\n→ SIGNAL: Partial corroboration from credible outlet(s). LIKELY true.';
  } else {
    summary += '\n→ SIGNAL: No direct news corroboration. Only background context. Treat as DEVELOPING/UNVERIFIED.';
  }

  // Social media warning
  summary += '\n\n⚠ RULE: Reddit, X/Twitter, Instagram are NEVER factual evidence. Do not cite them as proof.';

  return summary;
}

// ═══════════════════════════════════════════════════════════════
//  LAYER 2+3: Verification + Editorial Fact-Check
// ═══════════════════════════════════════════════════════════════
async function layerTwoThreeVerify(
  headline: string, body: string,
  understanding: ContentUnderstanding | null,
  sourceCredibility: 'tier1' | 'tier2' | 'questionable' | 'unknown',
  sourceCount: number, retrievalSummary: string,
  referenceLink?: string, isPremiumRoute: boolean = false,
): Promise<VerificationResult> {
  const now = new Date();
  const currentDate = now.toISOString().split('T')[0];
  const currentYear = now.getFullYear();

  const contextBlock = understanding ? `
LAYER 1 EXTRACTION:
- Primary claim: ${understanding.primaryClaim}
- People: ${(understanding.people || []).join(', ') || 'none'}
- Organizations: ${(understanding.organizations || []).join(', ') || 'none'}
- Entities: ${understanding.entities.join(', ')}
- Topic: ${understanding.topic}
- Geography: ${understanding.geography}
- Timeline: ${understanding.timeline}
- Dates mentioned: ${(understanding.datesMentioned || []).join(', ') || 'none'}
- Key claims: ${understanding.keyClaims.join(' | ')}
- Opinion piece: ${understanding.isOpinionPiece ? 'Yes' : 'No'}
` : '';

  const credLabel = sourceCredibility === 'tier1' ? 'TIER 1 TRUSTED'
    : sourceCredibility === 'tier2' ? 'TIER 2 CREDIBLE'
    : sourceCredibility === 'questionable' ? 'USER-GENERATED PLATFORM (not evidence)'
    : 'UNKNOWN';

  const prompt = `You are LETTR's senior editorial fact-checker. Write like a human editor at Reuters or The Hindu — concise, authoritative, never robotic.

TODAY: ${currentDate} (Year: ${currentYear})
RULE: NEVER reject because your training data doesn't cover ${currentYear}. The live retrieval below IS your evidence.

${contextBlock}

${retrievalSummary}

ARTICLE TO VERIFY:
Headline: ${headline}
Content: ${body.substring(0, 2000)}
Source URL: ${referenceLink || 'None'}
Source trust: ${credLabel}

SCORING RULES:
- 90-100: CONFIRMED. Multiple Tier 1/2 sources corroborate. Named entities verified. No contradictions.
- 85-89: LIKELY. Single TRUSTED source (Tier 1/2) is sufficient. Do NOT penalize single sourcing from credible publishers.
- 75-84: LIKELY. Credible but limited corroboration.
- 60-74: DEVELOPING. Real entities, plausible claims, but insufficient live confirmation. Confidence = "Low" or "Medium".
- 50-59: UNVERIFIED. Minimal sourcing, vague claims.
- 0-49: FALSE/FABRICATED. Only for outright debunked claims or complete nonsense.

CRITICAL RULES:
- Source is ${credLabel} with no contradictions in retrieval → minimum score 85.
- No retrieval coverage but real entities → score 60-74 as DEVELOPING, NOT false.
- NEVER say "reported by multiple outlets" unless retrieval actually found them.
- NEVER use "automated assessment" or "appears mostly factual".
- Reddit/X/Instagram are content sources, NEVER factual evidence.

VERIFICATION STATUS (pick exactly one):
- CONFIRMED: Multiple Tier 1/2 sources verify core claims
- LIKELY: Single trusted source or strong signals, no contradictions
- UNVERIFIED: No corroboration, cannot confirm or deny
- DEVELOPING: Breaking/recent news, evidence still emerging

OUTPUT FORMAT (max 120 words total):

FACT CHECK

✓ Verified
- [confirmed fact, max 8 words each]

⚠ Needs Confirmation
- [unverified claim, max 8 words each]

🧠 Context
- [1 short sentence of timeline/relevance]

Verdict: [1 concise editorial sentence]

Return JSON:
{
  "factScore": <0-100>,
  "summary": "<the editorial fact-check above as a single string with \\n line breaks>",
  "confidence": "<Low | Medium | High>",
  "sourcesChecked": <number of Tier1+Tier2 retrieval results>,
  "verificationStatus": "<CONFIRMED | LIKELY | UNVERIFIED | DEVELOPING>",
  "issues": ["<specific issue if any>"]
}`;

  const systemMsg = { role: "system", content: "You are a concise, authoritative editorial fact-checker. Max 120 words in summary. Never verbose, never robotic. Use the editorial format specified." };
  const userMsg = { role: "user", content: prompt };

  const modelsToTry = isPremiumRoute ? [PREMIUM_MODEL, UNDERSTANDING_MODEL] : [UNDERSTANDING_MODEL];

  for (const model of modelsToTry) {
    console.log(`[Verification] Trying: ${model}`);
    const result = await callGroq(model, [systemMsg, userMsg], 0.15);
    if (result) {
      try {
        const parsed = JSON.parse(result);
        console.log(`[Verification] ${model} OK.`);
        return {
          factScore: Math.max(0, Math.min(100, parsed.factScore ?? 50)),
          factSummary: parsed.summary || parsed.factSummary || "Verification unavailable.",
          confidence: parsed.confidence || "Medium",
          sourcesChecked: parsed.sourcesChecked ?? sourceCount,
          issues: parsed.issues || [],
          verificationStatus: parsed.verificationStatus || deriveStatus(parsed.factScore, parsed.confidence),
        };
      } catch {
        console.warn(`[Verification] ${model} bad JSON, next.`);
        continue;
      }
    }
    console.warn(`[Verification] ${model} failed.`);
  }

  console.warn(`[Verification] All models failed. Local fallback.`);
  return buildIntelligentFallback(headline, body, sourceCredibility, sourceCount, understanding);
}

function deriveStatus(score: number, confidence?: string): 'CONFIRMED' | 'LIKELY' | 'UNVERIFIED' | 'DEVELOPING' {
  if (score >= 90) return 'CONFIRMED';
  if (score >= 75) return 'LIKELY';
  if (score >= 60) return 'DEVELOPING';
  return 'UNVERIFIED';
}

// ─── Intelligent Fallback ───────────────────────────────────────
function buildIntelligentFallback(
  headline: string, body: string,
  sourceCredibility: 'tier1' | 'tier2' | 'questionable' | 'unknown',
  sourceCount: number, understanding: ContentUnderstanding | null
): VerificationResult {
  const bodyWordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const issues: string[] = [];
  let score = 55;

  if (sourceCredibility === 'tier1') score = 85;
  else if (sourceCredibility === 'tier2') score = 78;
  else if (sourceCredibility === 'questionable') { score = 52; issues.push('Source platform has limited editorial oversight.'); }

  if (bodyWordCount >= 250) score += 5;
  else if (bodyWordCount >= 150) score += 3;
  else issues.push('Article body is brief.');

  if (sourceCount >= 2) score += 4;
  else if (sourceCount >= 1) score += 2;
  else issues.push('No external source links provided.');

  if (understanding?.isOpinionPiece) { score = Math.min(score, 65); issues.push('Content is editorial/opinion.'); }
  score = Math.max(10, Math.min(95, score));

  const entities = understanding?.entities?.slice(0, 3).join(', ') || 'unnamed entities';
  const people = understanding?.people?.slice(0, 2).join(', ') || '';
  const orgs = understanding?.organizations?.slice(0, 2).join(', ') || '';
  const topic = understanding?.topic || 'general news';
  const geo = understanding?.geography || '';

  const factSummary = `✓ Verified\n- Entities: ${entities}\n${people ? `- People: ${people}\n` : ''}${orgs ? `- Organizations: ${orgs}\n` : ''}\n⚠ Needs Confirmation\n- AI verification engine unavailable; manual review recommended\n\n🧠 Context\n- ${topic} report${geo ? ` (${geo})` : ''}, ${sourceCredibility} source\n\nVerdict: Score based on source credibility signals. Full AI fact-check was unavailable.`;

  return {
    factScore: score,
    factSummary,
    confidence: score >= 80 ? 'Medium' : 'Low',
    sourcesChecked: sourceCount,
    issues,
    verificationStatus: deriveStatus(score),
  };
}

// ═══════════════════════════════════════════════════════════════
//  MAIN ENTRY: 3-Layer Verification Pipeline
// ═══════════════════════════════════════════════════════════════
export async function verifyFact(
  headline: string, body: string,
  referenceLink?: string,
  mediaContext?: { imageUrl?: string; videoUrl?: string },
  isPremiumRoute: boolean = false
): Promise<VerificationResult> {
  const sourceLinks = extractSourceLinks(referenceLink);
  const sourceCount = sourceLinks.length;

  let sourceCredibility: 'tier1' | 'tier2' | 'questionable' | 'unknown' = 'unknown';
  if (referenceLink) sourceCredibility = getSourceCredibility(referenceLink);

  if (!process.env.GROQ_API_KEY) {
    return buildIntelligentFallback(headline, body, sourceCredibility, sourceCount, null);
  }

  // Layer 1: Content Understanding
  console.log(`[Verification] Layer 1: Understanding...`);
  const understanding = await layerOneUnderstand(headline, body);
  if (understanding) {
    console.log(`[Verification] L1: claim="${understanding.primaryClaim?.substring(0, 60)}..." | people=${understanding.people?.length || 0} | orgs=${understanding.organizations?.length || 0} | timeline=${understanding.timeline}`);
  }

  // Live Retrieval Engine
  console.log(`[Verification] Live Retrieval: Searching trusted sources...`);
  const retrieval = await performLiveRetrieval(understanding, headline);
  const tier1Count = retrieval.results.filter(r => r.tier === 'tier1').length;
  const tier2Count = retrieval.results.filter(r => r.tier === 'tier2').length;
  console.log(`[Verification] Retrieval: ${retrieval.results.length} total (T1:${tier1Count} T2:${tier2Count})`);

  // Layer 2+3: Verification + Editorial
  console.log(`[Verification] Layer 2+3: Verifying with live context...`);
  const result = await layerTwoThreeVerify(
    headline, body, understanding,
    sourceCredibility, sourceCount, retrieval.summary, referenceLink, isPremiumRoute
  );

  console.log(`[Verification] Done: Score=${result.factScore} Confidence=${result.confidence} Status=${result.verificationStatus}`);
  return result;
}

export function isVerificationCoolingDown(): boolean { return isInCooldown(); }
