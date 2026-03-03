/**
 * Reads the session cookie and validates it against AUTH_KV.
 * Returns {email, userId} if valid, null otherwise.
 */
export async function getSession(request, env) {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  const raw = await env.AUTH_KV.get(`session:${token}`);
  return raw ? JSON.parse(raw) : null;
}

/**
 * Returns a JSON 401 response for unauthenticated requests.
 */
export function unauthorized() {
  return new Response(JSON.stringify({ error: 'unauthenticated' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Returns a JSON response.
 */
export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}
