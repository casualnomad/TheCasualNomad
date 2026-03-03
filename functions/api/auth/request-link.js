import { json } from '../../_shared/auth.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function onRequestPost(context) {
  const { request, env } = context;

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json({ error: 'Please enter a valid email address' }, 400);
  }

  // Generate a one-time token and store it in KV with 15-minute TTL
  const token = crypto.randomUUID();
  await env.AUTH_KV.put(`token:${token}`, JSON.stringify({ email }), { expirationTtl: 900 });

  const link = `${env.APP_URL}/api/auth/verify?token=${token}`;

  // Send magic link email via Resend
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${env.RESEND_API_KEY}`
    },
    body: JSON.stringify({
      from: `The Casual Nomad <noreply@${new URL(env.APP_URL).hostname}>`,
      to: [email],
      subject: 'Your sign-in link for The Casual Nomad',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#0f1117;color:#e0e0e0;border-radius:8px">
          <h2 style="color:#f4a622;margin-top:0">The Casual Nomad</h2>
          <p>Click the button below to sign in. This link expires in <strong>15 minutes</strong>.</p>
          <a href="${link}" style="display:inline-block;background:#f4a622;color:#0f1117;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;margin:16px 0">Sign in</a>
          <p style="font-size:12px;color:#888">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Resend error:', err);
    return json({ error: 'Failed to send email — please try again' }, 500);
  }

  return json({ ok: true });
}
