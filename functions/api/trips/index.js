import { getSession, unauthorized, json } from '../../_shared/auth.js';

// GET /api/trips — list all trips for the signed-in user
export async function onRequestGet(context) {
  const session = await getSession(context.request, context.env);
  if (!session) return unauthorized();

  const { results } = await context.env.DB
    .prepare('SELECT id, dest, created_at, updated_at FROM trips WHERE user_id = ? ORDER BY updated_at DESC')
    .bind(session.userId)
    .all();

  return json(results);
}

// POST /api/trips — create a new trip
export async function onRequestPost(context) {
  const session = await getSession(context.request, context.env);
  if (!session) return unauthorized();

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const dest = (body.dest || 'Trip').slice(0, 200);
  const data = body.data;
  if (!data) return json({ error: 'Missing data' }, 400);

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await context.env.DB
    .prepare('INSERT INTO trips (id, user_id, dest, created_at, updated_at, data) VALUES (?, ?, ?, ?, ?, ?)')
    .bind(id, session.userId, dest, now, now, JSON.stringify(data))
    .run();

  return json({ id });
}
