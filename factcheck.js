/**
 * factcheck.js
 * Core verdict engine for Factr.
 *
 * Strategy:
 *  1. Query Google's Fact Check Tools API (free tier, needs a Google Cloud API key
 *     with "Fact Check Tools API" enabled). This searches claims already reviewed
 *     by outlets like PolitiFact, Snopes, Reuters Fact Check, AFP, etc.
 *  2. If nothing is found there, fall back to a Tavily web search (optional key)
 *     and summarize what reputable sources say, clearly labeled as "unverified by
 *     a fact-check org" rather than a hard TRUE/FALSE.
 *
 * Both API keys are optional independently. With neither key set, Factr still
 * works but only returns "no fact-check on file" responses.
 */

const GOOGLE_FACTCHECK_ENDPOINT = "https://factchecktools.googleapis.com/v1alpha1/claims:search";
const TAVILY_ENDPOINT = "https://api.tavily.com/search";

/** Strip the trigger word/mention off a raw Discord message to get the claim text. */
function extractClaim(rawContent, botUserId) {
  let text = rawContent.trim();
  text = text.replace(new RegExp(`<@!?${botUserId}>`, "g"), "").trim();
  text = text.replace(/^!factr\b/i, "").trim();
  text = text.replace(/^(is it true that|is it true|fact[- ]?check[:]?)/i, "").trim();
  text = text.replace(/\?+$/, "").trim();
  return text;
}

function ratingToVerdict(textualRating) {
  if (!textualRating) return { emoji: "❓", label: "UNVERIFIED" };
  const r = textualRating.toLowerCase();
  if (/(false|pants on fire|incorrect|fabricated|hoax|debunk)/.test(r)) {
    return { emoji: "❌", label: "FALSE" };
  }
  if (/(true|correct|accurate)/.test(r) && !/(mostly|half)/.test(r)) {
    return { emoji: "✅", label: "TRUE" };
  }
  if (/(mostly true|mostly false|half true|mixed|partly|misleading|exaggerat)/.test(r)) {
    return { emoji: "⚠️", label: "MIXED" };
  }
  return { emoji: "❓", label: "UNVERIFIED" };
}

async function queryGoogleFactCheck(claim, apiKey) {
  const url = `${GOOGLE_FACTCHECK_ENDPOINT}?query=${encodeURIComponent(claim)}&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const first = data.claims && data.claims[0];
  if (!first) return null;
  const review = first.claimReview && first.claimReview[0];
  if (!review) return null;
  const verdict = ratingToVerdict(review.textualRating);
  return {
    verdict,
    rating: review.textualRating,
    publisher: review.publisher && review.publisher.name,
    url: review.url,
    claimText: first.text,
    source: "google-factcheck",
  };
}

async function queryTavilyFallback(claim, apiKey) {
  const res = await fetch(TAVILY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: `fact check: ${claim}`,
      search_depth: "basic",
      max_results: 3,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const top = data.results && data.results[0];
  if (!top) return null;
  return {
    verdict: { emoji: "❓", label: "SEE SOURCES" },
    rating: null,
    publisher: top.title,
    url: top.url,
    claimText: claim,
    source: "web-search",
    snippet: top.content ? top.content.slice(0, 240) : null,
  };
}

/**
 * Main entry point. Returns a verdict object or null if nothing could be found.
 */
async function checkClaim(claim, { googleApiKey, tavilyApiKey } = {}) {
  if (!claim) return null;

  if (googleApiKey) {
    const hit = await queryGoogleFactCheck(claim, googleApiKey);
    if (hit) return hit;
  }

  if (tavilyApiKey) {
    const hit = await queryTavilyFallback(claim, tavilyApiKey);
    if (hit) return hit;
  }

  return null;
}

module.exports = { checkClaim, extractClaim, ratingToVerdict };
