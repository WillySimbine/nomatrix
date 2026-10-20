// Secrets: TG_TOKEN, TG_CHAT, RESEND_KEY, EMAIL_TO (opcionais: WA_TOKEN, WA_PHONE_ID, WA_TO)
const CORS={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST,OPTIONS'};
const IDLE=10*60*1000;

export default{
 async fetch(req,env,ctx){
  if(req.method==='OPTIONS')return new Response(null,{headers:CORS});
  if(req.method!=='POST')return new Response('ok',{headers:CORS});
  try{
   const b=await req.json(),raw=JSON.stringify(b.data||{});
   if(typeof b.id!=='string'||b.id.length>64||raw.length>20000)return new Response('bad',{status:400,headers:CORS});
   const now=Date.now(),step=b.step|0;
   await env.DB.prepare('INSERT INTO leads(id,data,step,done,sent,updated) VALUES(?,?,?,?,0,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,step=excluded.step,done=excluded.done,sent=0,updated=excluded.updated').bind(b.id,raw,step,b.done?1:0,now).run();
   if(b.done)ctx.waitUntil(send(env,{id:b.id,data:raw,step,done:1,updated:now}));
   return new Response('ok',{headers:CORS});
  }catch(e){return new Response('err',{status:500,headers:CORS})}
 },
 async scheduled(_,env,ctx){
  const {results}=await env.DB.prepare('SELECT * FROM leads WHERE sent=0 AND updated<?').bind(Date.now()-IDLE).all();
  for(const r of results)ctx.waitUntil(send(env,r));
 }
};

async function send(env,r){
 const d=JSON.parse(r.data),num=String(d.whatsapp||'').replace(/\D/g,'');
 const cap=`${r.done?'Diagnóstico completo':'Cliente saiu a meio'}: ${d.nome} (${d.whatsapp}), passo ${r.step}/20, fase ${d.fase}, ponto fraco ${d.fraco}${r.done?'':' (provisório)'}`;
 const pdfBytes=pdf(['NOMATRIX | Diagnóstico',cap,'wa.me/'+num,'','Negócio: '+d.negocio,'Pontuação: '+d.pontos,'',...(d.resumo||[]).map(([q,a])=>q+': '+a)]);
 const fn='diagnostico-'+String(d.nome||'lead').replace(/\W+/g,'-')+'.pdf';
 const f=new FormData();f.append('chat_id',env.TG_CHAT);f.append('caption',cap);f.append('document',new Blob([pdfBytes],{type:'application/pdf'}),fn);
 const jobs=[
  fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendDocument`,{method:'POST',body:f}),
  fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+env.RESEND_KEY,'Content-Type':'application/json'},body:JSON.stringify({from:'Nomatrix <onboarding@resend.dev>',to:[env.EMAIL_TO],subject:cap,text:cap+'\nwa.me/'+num,attachments:[{filename:fn,content:btoa(String.fromCharCode(...pdfBytes))}]})})
 ];
 if(env.WA_TOKEN)jobs.push(fetch(`https://graph.facebook.com/v20.0/${env.WA_PHONE_ID}/messages`,{method:'POST',headers:{Authorization:'Bearer '+env.WA_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({messaging_product:'whatsapp',to:env.WA_TO,type:'text',text:{body:cap+'\nwa.me/'+num}})}));
 await Promise.allSettled(jobs);
 await env.DB.prepare('UPDATE leads SET sent=1 WHERE id=? AND updated=?').bind(r.id,r.updated).run();
}

// PDF mínimo, sem dependências (Helvetica, texto)
function pdf(lines){
 const L=[];for(const l of lines)for(let s=String(l);;){L.push(s.slice(0,90));s=s.slice(90);if(!s)break}
 const pages=[];for(let i=0;i<L.length;i+=50)pages.push(L.slice(i,i+50));
 const o=[];
 o[1]='<</Type/Catalog/Pages 2 0 R>>';
 o[2]=`<</Type/Pages/Kids[${pages.map((_,i)=>`${4+i*2} 0 R`).join(' ')}]/Count ${pages.length}>>`;
 o[3]='<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>';
 pages.forEach((p,i)=>{
  const t='BT /F1 11 Tf 14 TL 50 790 Td '+p.map(l=>`(${l.replace(/[\\()]/g,'\\$&').replace(/[^\x20-\xff]/g,'?')}) Tj T*`).join(' ')+' ET';
  o[4+i*2]=`<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 3 0 R>>>>/Contents ${5+i*2} 0 R>>`;
  o[5+i*2]=`<</Length ${t.length}>>stream\n${t}\nendstream`;
 });
 let s='%PDF-1.4\n';const x=[];
 for(let i=1;i<o.length;i++){x[i]=s.length;s+=`${i} 0 obj\n${o[i]}\nendobj\n`}
 const r=s.length;
 s+=`xref\n0 ${o.length}\n0000000000 65535 f \n`+x.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<</Size ${o.length}/Root 1 0 R>>\nstartxref\n${r}\n%%EOF`;
 return Uint8Array.from(s,c=>c.charCodeAt(0));
}
