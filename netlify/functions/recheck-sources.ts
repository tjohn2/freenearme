import {createClient} from "@supabase/supabase-js";
export default async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return new Response("missing service role",{status:500});
 const db=createClient(url,key);
 const{data}=await db.from("listing_cache").select("id,source_url").not("source_url","is",null).order("source_checked_at",{ascending:true,nullsFirst:true}).limit(60);
 for(const row of data||[]){
  try{
   const ctrl=new AbortController();const t=setTimeout(()=>ctrl.abort(),7000);
   const r=await fetch(row.source_url,{method:"HEAD",redirect:"follow",signal:ctrl.signal,headers:{"User-Agent":"FreeNearMe/1.0 source verification"}});
   clearTimeout(t);
   const status=r.status;
   if(status===404||status===410)await db.from("listing_cache").delete().eq("id",row.id);
   else await db.from("listing_cache").update({source_checked_at:new Date().toISOString(),source_http_status:status}).eq("id",row.id);
  }catch{await db.from("listing_cache").update({source_checked_at:new Date().toISOString(),source_http_status:0}).eq("id",row.id)}
 }
 return new Response("ok");
};
export const config={schedule:"0 7 * * *"};