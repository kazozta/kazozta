// Records cart contents only; no customer name, phone, or address is sent.
export async function recordOrderAttempt(cartItems, products) {
 const items={};
 for(const [id,quantity] of Object.entries(cartItems||{})){
  const p=products.find(x=>x.id===id);
  if(p&&Number.isInteger(quantity)&&quantity>0) items[id]={name:p.name,quantity,unitPrice:Number(p.price)};
 }
 if(!Object.keys(items).length) return {ok:false};
 try { const r=await fetch('/api/order-attempt',{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify({items})}); return r.ok?{ok:true,...await r.json()}:{ok:false}; }
 catch(e){console.error(e);return {ok:false};}
}
