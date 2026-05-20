import { getSession, unauthorized, json } from '../../_shared/auth.js';

export async function onRequestGet(context) {
  const session = await getSession(context.request, context.env);
  if (!session) return unauthorized();
  return json({ email: session.email });
}
