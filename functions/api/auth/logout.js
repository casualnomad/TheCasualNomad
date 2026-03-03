import { getSession, json } from '../../_shared/auth.js';

export async function onRequestPost(context) {
  const { request, env } = context;

  // Delete the session from KV if it exists
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)session=([^;]+)/);
  if (match) {
    await env.AUTH_KV.delete(`session:${match[1]}`).catch(() => {});
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; HttpOnly; Secure; SameSite=Lax; Max-Age=0; Path=/'
    }
  });
}
