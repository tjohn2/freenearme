import {createClient} from "@supabase/supabase-js";
export default async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return new Response("missing service role",{status:500});
 const db=createClient(url,key);
 const{data:sources}=await db.from("source_registry").select("*").eq("active",true);
 for(const s of sources||[]){
  let status="error",count=0,error:string|null=null;
  try{
   const u=new URL(s.url);
   if(s.source_type==="localist"){u.searchParams.set("pp","1");u.searchParams.set("days","30")}
   if(s.source_type==="tribe"){u.searchParams.set("per_page","1")}
   const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),8000);
   const r=await fetch(u,{headers:{"User-Agent":"FreeNearMe/1.0 source verifier"},signal:ctrl.signal});
   clearTimeout(t);
   if(r.ok){status="ok";const j=await r.json();count=Array.isArray(j)?j.length:Array.isArray(j.events)?j.events.length:0}else{status="http_"+r.status;error="HTTP "+r.status}
  }catch(e:any){error=String(e?.message||e).slice(0,500)}
  await db.from("source_health").upsert({source_name:s.id,result_count:count,last_status:status,last_checked_at:new Date().toISOString(),last_error:error,updated_at:new Date().toISOString()},{onConflict:"source_name"});
  if(status==="ok")await db.from("source_registry").update({last_verified_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",s.id);
 }
 return new Response("ok");
};
export const config={schedule:"30 6 * * *"};