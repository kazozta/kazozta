import { randomToken, redirect, sha256 } from '../../_lib.js';

export async function onRequestGet({ env, request }) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_REDIRECT_URI) return redirect(new URL('/admin/?auth=setup', request.url).toString());
  const state = randomToken();
  const nonce = randomToken();
  const verifier = randomToken(48);
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    nonce,
    prompt: 'select_account',
    code_challenge: await sha256(verifier),
    code_challenge_method: 'S256',
  });
  return redirect(url.toString(), [
    `kz_oauth_state=${state}; Path=/api/auth/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    `kz_oauth_nonce=${nonce}; Path=/api/auth/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    `kz_oauth_verifier=${verifier}; Path=/api/auth/callback; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
  ]);
}
