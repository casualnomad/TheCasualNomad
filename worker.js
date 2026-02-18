// ============================================================
//  Packing List — Cloudflare Worker API Proxy
//  Paste this into the Cloudflare Worker editor at
//  dash.cloudflare.com → Workers & Pages → Create → Worker
// ============================================================

export default {
  async fetch(request, env) {

    // ── CORS preflight ──
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // ── Get API key from Worker environment variable ──
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return json({ error: 'ANTHROPIC_API_KEY not set in Worker environment variables' }, 500);
    }

    // ── Parse incoming request ──
    let prompt;
    try {
      ({ prompt } = await request.json());
      if (!prompt) throw new Error('Missing prompt');
    } catch (e) {
      return json({ error: 'Invalid request body' }, 400);
    }

    // ── Call Anthropic ──
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4000,
          system: `You are a smart travel packing assistant. Generate detailed, practical packing lists tailored precisely to the traveller's destination, climate, activities, bag, and trip style. Respond ONLY with valid JSON. No markdown. No explanation. No code fences. Just the raw JSON object.`,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return json({ error: err.error?.message || 'Anthropic API error' }, response.status);
      }

      const data = await response.json();
      const result = (data.content || []).map(b => b.text || '').join('');

      return new Response(JSON.stringify({ result }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });

    } catch (err) {
      return json({ error: err.message || 'Internal server error' }, 500);
    }
  },
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
