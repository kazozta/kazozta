import { cookieValue, json, SESSION_COOKIE, sha256, sameOrigin } from '../../_lib.js';

export async function onRequestPost({ request, env }) {
  if (!sameOrigin(request)) return json({ error: 'Invalid origin' }, 403);
  const token = cookieValue(request, SESSION_COOKIE);
  if (token && env.DB) await env.DB.prepare('DELETE FROM auth_sessions WHERE session_hash=?').bind(await sha256(token)).run();
  return new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store', 'Set-Cookie': `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
}
