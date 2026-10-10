const OWNER = 'kazozta1@gmail.com';
const SESSION_COOKIE = 'kz_dashboard_session';

function base64url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function fromBase64url(value) {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - value.length % 4) % 4));
  return Uint8Array.from(binary, c => c.charCodeAt(0));
}

export function cookieValue(request, name) {
  const item = (request.headers.get('Cookie') || '').split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`));
  return item ? item.slice(name.length + 1) : '';
}

export function json(data, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}

export function redirect(url, cookies = []) {
  const headers = new Headers({ Location: url, 'Cache-Control': 'no-store' });
  for (const value of cookies) headers.append('Set-Cookie', value);
  return new Response(null, { status: 302, headers });
}

export function clearOAuthCookies() {
  return [
    'kz_oauth_state=; Path=/api/auth/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
    'kz_oauth_nonce=; Path=/api/auth/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
    'kz_oauth_verifier=; Path=/api/auth/callback; Max-Age=0; HttpOnly; Secure; SameSite=Lax',
  ];
}

export function randomToken(bytes = 32) {
  return base64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

export async function sha256(value) {
  return base64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
}

export function sameOrigin(request) {
  const origin = request.headers.get('Origin');
  return origin === new URL(request.url).origin;
}

async function googleIdentity(idToken, expectedNonce, clientId) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Invalid ID token');
  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  let header, payload;
  try {
    header = JSON.parse(new TextDecoder().decode(fromBase64url(encodedHeader)));
    payload = JSON.parse(new TextDecoder().decode(fromBase64url(encodedPayload)));
  } catch {
    throw new Error('Invalid ID token');
  }
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== 'RS256' || typeof header.kid !== 'string' ||
      !['accounts.google.com', 'https://accounts.google.com'].includes(payload.iss) ||
      payload.aud !== clientId || (payload.azp && payload.azp !== clientId) ||
      !payload.exp || payload.exp <= now || (payload.nbf && payload.nbf > now) ||
      payload.nonce !== expectedNonce || payload.email_verified !== true ||
      typeof payload.email !== 'string' || typeof payload.sub !== 'string') {
    throw new Error('Invalid Google identity claims');
  }
  const response = await fetch('https://www.googleapis.com/oauth2/v3/certs', { cf: { cacheTtl: 300 } });
  if (!response.ok) throw new Error('Unable to load Google signing keys');
  const jwks = await response.json();
  const jwk = jwks.keys?.find(key => key.kid === header.kid && key.alg === 'RS256');
  if (!jwk) throw new Error('Unknown Google signing key');
  const publicKey = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', publicKey, fromBase64url(encodedSignature),
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`),
  );
  if (!valid) throw new Error('Invalid Google token signature');
  return { email: payload.email.toLowerCase(), name: typeof payload.name === 'string' ? payload.name.slice(0, 160) : '' };
}

export async function identity(request, env) {
  if (!env.DB) throw new Response('Database not configured', { status: 503 });
  const token = cookieValue(request, SESSION_COOKIE);
  if (!token || token.length > 100) throw new Response('Authentication required', { status: 401 });
  const hash = await sha256(token);
  const session = await env.DB.prepare('SELECT email FROM auth_sessions WHERE session_hash=? AND expires_at>?').bind(hash, Math.floor(Date.now() / 1000)).first();
  if (!session) throw new Response('Authentication required', { status: 401 });
  const email = session.email.toLowerCase();
  if (email === OWNER) return { email, role: 'owner' };
  const member = await env.DB.prepare('SELECT role FROM dashboard_users WHERE email=? AND active=1').bind(email).first();
  if (!member) throw new Response('Forbidden', { status: 403 });
  return { email, role: member.role };
}

export async function completeGoogleLogin({ code, expectedNonce, codeVerifier, env, request }) {
  if (!code || !expectedNonce || !codeVerifier || !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_REDIRECT_URI || !env.DB) {
    throw new Error('Google OAuth is not configured');
  }
  const redirectUrl = new URL(env.GOOGLE_REDIRECT_URI);
  if (redirectUrl.protocol !== 'https:' || !redirectUrl.pathname.endsWith('/api/auth/callback')) throw new Error('Invalid OAuth redirect URI');
  const form = new URLSearchParams({
    code,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: form,
  });
  if (!tokenResponse.ok) throw new Error('Google token exchange failed');
  const tokenBody = await tokenResponse.json();
  if (typeof tokenBody.id_token !== 'string') throw new Error('Google did not return an ID token');
  const googleUser = await googleIdentity(tokenBody.id_token, expectedNonce, env.GOOGLE_CLIENT_ID);
  if (googleUser.email !== OWNER) {
    const member = await env.DB.prepare('SELECT role FROM dashboard_users WHERE email=? AND active=1').bind(googleUser.email).first();
    if (!member) throw new Error('Account is not authorized for this dashboard');
  }
  const sessionToken = randomToken(32);
  const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
  const sessionHash = await sha256(sessionToken);
  await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(Math.floor(Date.now() / 1000)),
    env.DB.prepare('INSERT INTO auth_sessions(session_hash,email,expires_at) VALUES(?,?,?)').bind(sessionHash, googleUser.email, expiresAt),
  ]);
  const cookies = [
    ...clearOAuthCookies(),
    `${SESSION_COOKIE}=${sessionToken}; Path=/; Max-Age=${60 * 60 * 12}; HttpOnly; Secure; SameSite=Lax`,
  ];
  return redirect(new URL('/admin/', request.url).toString(), cookies);
}

export { SESSION_COOKIE };
