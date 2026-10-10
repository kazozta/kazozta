import { clearOAuthCookies, completeGoogleLogin, cookieValue, redirect } from '../../_lib.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const state = url.searchParams.get('state');
  const code = url.searchParams.get('code');
  if (!code || !state || state !== cookieValue(request, 'kz_oauth_state')) {
    return redirect(new URL('/admin/?auth=failed', request.url).toString(), clearOAuthCookies());
  }
  try {
    return await completeGoogleLogin({ code, expectedNonce: cookieValue(request, 'kz_oauth_nonce'), codeVerifier: cookieValue(request, 'kz_oauth_verifier'), env, request });
  } catch (error) {
    const reason = String(error?.message || '').includes('not authorized') ? 'denied' : 'failed';
    return redirect(new URL(`/admin/?auth=${reason}`, request.url).toString(), clearOAuthCookies());
  }
}
