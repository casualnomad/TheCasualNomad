import { getSession, unauthorized, json } from '../../_shared/auth.js';

// GET /api/trips/:id — load a trip's full data
export async function onRequestGet(context) {
  const session = await getSession(context.request, context.env);
  if (!session) return unauthorized();

  const { id } = context.params;
  const row = await context.env.DB
    .prepare('SELECT data FROM trips WHERE id = ? AND user_id = ?')
    .bind(id, session.userId)
    .first();

  if (!row) return json({ error: 'Not found' }, 404);

  let data;
  try { data = JSON.parse(row.data); } catch { return json({ error: 'Corrupt trip data' }, 500); }

  return json(data);
}

// PUT /api/trips/:id — update a trip's data
export async function onRequestPut(context) {
  const session = await getSession(context.request, context.env);
  if (!session) return unauthorized();

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  const { id } = context.params;
  const dest = (body.dest || 'Trip').slice(0, 200);
  const data = body.data;
  if (!data) return json({ error: 'Missing data' }, 400);

  const now = Math.floor(Date.now() / 1000);
  const result = await context.env.DB
    .prepare('UPDATE trips SET data = ?, updated_at = ?, dest = ? WHERE id = ? AND user_id = ?')
    .bind(JSON.stringify(data), now, dest, id, session.userId)
    .run();

  if (result.meta.changes === 0) return json({ error: 'Not found' }, 404);

  return json({ ok: true });
}

// DELETE /api/trips/:id — delete a trip
export async function onRequestDelete(context) {
  const session = await getSession(context.request, context.env);
  if (!session) return unauthorized();

  const { id } = context.params;
  const result = await context.env.DB
    .prepare('DELETE FROM trips WHERE id = ? AND user_id = ?')
    .bind(id, session.userId)
    .run();

  if (result.meta.changes === 0) return json({ error: 'Not found' }, 404);

  return json({ ok: true });
}
