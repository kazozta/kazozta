import {json} from '../_lib.js';
export async function onRequestPost({request,env}) {
  if(!env.DB) return json({error:'Database not configured'},503);
  const origin=request.headers.get('Origin');
  if(origin&&origin!==new URL(request.url).origin)return json({error:'Invalid origin'},403);
  if(!(request.headers.get('content-type')||'').includes('application/json')) return json({error:'JSON required'},415);
  let body; try{body=await request.json()}catch{return json({error:'Invalid JSON'},400)}
  if(!body||!body.items||typeof body.items!=='object'||Array.isArray(body.items)) return json({error:'Invalid items'},400);
  const entries=Object.entries(body.items); if(!entries.length||entries.length>30) return json({error:'Invalid item count'},400);
  let subtotal=0; const items=[];
  for(const [id,item] of entries){
    if(!/^[a-z0-9-]{1,80}$/.test(id)||!item||typeof item.name!=='string') return json({error:'Invalid item'},400);
    const qty=Number(item.quantity),price=Number(item.unitPrice);
    if(!Number.isInteger(qty)||qty<1||qty>100||!Number.isFinite(price)||price<0||price>100000) return json({error:'Invalid price/quantity'},400);
    const p=Math.round(price*100); subtotal+=p*qty; items.push({id,name:item.name.slice(0,160),quantity:qty,unitPricePiasters:p});
  }
  const vat=Math.round(subtotal*.14),total=subtotal+vat,id=crypto.randomUUID();
  await env.DB.prepare("INSERT INTO order_attempts(id,subtotal_piasters,vat_piasters,total_piasters,items_json,status) VALUES(?,?,?,?,?,'whatsapp_open_attempt')").bind(id,subtotal,vat,total,JSON.stringify(items)).run();
  return json({ok:true,id,subtotal:subtotal/100,vat:vat/100,total:total/100},201);
}
