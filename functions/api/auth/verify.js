const EXPIRED_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Link Expired — The Casual Nomad</title>
  <style>
    body { font-family: sans-serif; background: #0f1117; color: #e0e0e0; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #181c24; border: 1px solid #2a2f3d; border-radius: 12px; padding: 40px; max-width: 400px; text-align: center; }
    h2 { color: #f4a622; margin-top: 0; }
    a { color: #f4a622; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Link expired</h2>
    <p>This sign-in link has expired or already been used.</p>
    <p><a href="/">Go back and request a new one &rarr;</a></p>
  </div>
</body>
</html>`;

export async function onRequestGet(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return new Response(EXPIRED_HTML, { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  // Look up and immediately delete the one-time token
  const raw = await env.AUTH_KV.get(`token:${token}`);
  if (!raw) {
    return new Response(EXPIRED_HTML, { status: 400, headers: { 'Content-Type': 'text/html' } });
  }
  await env.AUTH_KV.delete(`token:${token}`);

  const { email } = JSON.parse(raw);
  const now = Math.floor(Date.now() / 1000);

  // Upsert user into D1
  let userId;
  const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (existing) {
    userId = existing.id;
  } else {
    userId = crypto.randomUUID();
    await env.DB.prepare('INSERT INTO users (id, email, created_at) VALUES (?, ?, ?)').bind(userId, email, now).run();
  }

  // Create session in D1 (30 days, strongly consistent)
  const sessionId = crypto.randomUUID();
  await env.DB.prepare(
    'INSERT INTO sessions (id, user_id, email, created_at, expires_at) VALUES (?, ?, ?, ?, ?)'
  ).bind(sessionId, userId, email, now, now + 2592000).run();

  const isProd = new URL(env.APP_URL).protocol === 'https:';
  const cookieFlags = `HttpOnly; SameSite=Lax; Max-Age=2592000; Path=/${isProd ? '; Secure' : ''}`;

  return new Response(null, {
    status: 302,
    headers: {
      'Location': `/?_auth=${encodeURIComponent(email)}`,
      'Set-Cookie': `session=${sessionId}; ${cookieFlags}`
    }
  });
}
