export async function onRequest({request,next}) {
  const response=await next();
  const headers=new Headers(response.headers);
  headers.set('X-Content-Type-Options','nosniff'); headers.set('Referrer-Policy','strict-origin-when-cross-origin');
  headers.set('X-Frame-Options','DENY');
  return new Response(response.body,{status:response.status,statusText:response.statusText,headers});
}
