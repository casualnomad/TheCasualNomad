// ============================================================
//  Packing List — Cloudflare Worker API Proxy
//  Called via Service Binding from Pages Function only.
// ============================================================

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {

    // ── Block all direct external requests ──
    // This Worker is only reachable via Service Binding from the Pages Function.
    // Any request arriving with an Origin header is coming directly from a browser
    // and should be rejected.
    const origin = request.headers.get('Origin');
    if (origin) {
      return new Response('Forbidden', { status: 403 });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    // ── Rate limit ──
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `rate:${ip}`;
    const current = await env.RATE_LIMIT_KV.get(key);
    const count = parseInt(current || '0');
    if (count >= 3) {
      return json({ error: 'Too many requests. Try again in a while.' }, 429);
    }
    await env.RATE_LIMIT_KV.put(key, (count + 1).toString(), {
      expirationTtl: 120
    });

    // ── API key ──
    const apiKey = env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return json({ error: 'ANTHROPIC_API_KEY not set in Worker environment variables' }, 500);
    }

    // ── Parse request body ──
    let prompt;
    try {
      const body = await request.json();
      prompt = body?.prompt;
      if (!prompt) throw new Error('Missing prompt');
      if (prompt.length > 4000) throw new Error('Prompt too large');
    } catch (e) {
      return json({ error: e.message || 'Invalid request body' }, 400);
    }

    // ── Call Anthropic ──
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 4000,
          system: `You are a smart travel packing assistant. Generate detailed, practical packing lists tailored precisely to the traveller's destination, climate, activities, bag, and trip style. Respond ONLY with valid JSON. No markdown. No explanation. No code fences. Just the raw JSON object.`,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        return json({ error: err.error?.message || 'Anthropic API error' }, response.status);
      }

      const data = await response.json();
      const result = (data.content || []).map(b => b.text || '').join('');
      return json({ result });

    } catch (err) {
      clearTimeout(timeout);
      return json({ error: err.message || 'Internal server error' }, 500);
    }
  },
};