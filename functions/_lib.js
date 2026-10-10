const OWNER='kazozta1@gmail.com';
function decode(s){return atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4));}
export function json(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}})}
export async function identity(request,env){
  const token=request.headers.get('Cf-Access-Jwt-Assertion');
  if(!token||!env.ACCESS_TEAM_DOMAIN||!env.ACCESS_AUD)throw new Response('Authentication required',{status:401});
  const [h,p,s]=token.split('.'); let head,payload;
  try{head=JSON.parse(decode(h));payload=JSON.parse(decode(p));}catch{throw new Response('Invalid access token',{status:401});}
  const iss=`https://${env.ACCESS_TEAM_DOMAIN}`;
  const expectedAudiences=String(env.ACCESS_AUD||'').split(',').map(value=>value.trim()).filter(Boolean);
  if(payload.iss!==iss||!Array.isArray(payload.aud)||!payload.aud.some(value=>expectedAudiences.includes(value))||!payload.exp||payload.exp<Date.now()/1000||(payload.nbf&&payload.nbf>Date.now()/1000)||head.alg!=='RS256')throw new Response('Invalid access token',{status:401});
  const jwks=await fetch(`${iss}/cdn-cgi/access/certs`).then(r=>r.json()); const jwk=jwks.keys?.find(k=>k.kid===head.kid);
  if(!jwk)throw new Response('Unknown signing key',{status:401});
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  const sig=Uint8Array.from(decode(s),c=>c.charCodeAt(0));
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,sig,new TextEncoder().encode(`${h}.${p}`))||typeof payload.email!=='string')throw new Response('Invalid access token',{status:401});
  const email=payload.email.toLowerCase(); if(email===OWNER)return{email,role:'owner'};
  const m=await env.DB.prepare('SELECT role FROM dashboard_users WHERE email=? AND active=1').bind(email).first();
  if(!m)throw new Response('Forbidden',{status:403}); return{email,role:m.role};
}
