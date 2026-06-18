const fetch = require('node-fetch');

const TAVILY_URL = 'https://api.tavily.com/search';

/**
 * Calls Tavily's search API to get fresh, real web results.
 * Returns a short array of { title, url, content } results,
 * or throws if the request fails.
 */
async function searchWeb(query) {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set on the server.');
  }

  const response = await fetch(TAVILY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: 'basic', // 'advanced' costs more credits, 'basic' is fine for v1
      max_results: 5,
      include_answer: false,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tavily error ${response.status}: ${text}`);
  }

  const data = await response.json();

  // Normalize to a small, clean shape so the LLM prompt stays short
  return (data.results || []).map((r) => ({
    title: r.title,
    url: r.url,
    content: (r.content || '').slice(0, 500), // keep prompt size sane
  }));
}

module.exports = { searchWeb };
