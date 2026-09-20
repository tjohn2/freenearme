import {createClient} from "@supabase/supabase-js";
export default async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return new Response("missing service role",{status:500});
 const db=createClient(url,key);
 const{data}=await db.from("listing_cache").select("id,source_url").not("source_url","is",null).order("source_checked_at",{ascending:true,nullsFirst:true}).limit(20);
 for(const row of data||[]){
  try{
   const u=new URL(row.source_url);if(u.protocol!=="https:"&&u.protocol!=="http:")continue;if(["localhost","127.0.0.1","0.0.0.0","::1"].includes(u.hostname)||/^10\.|^192\.168\.|^169\.254\.|^172\.(1[6-9]|2\d|3[01])\./.test(u.hostname))continue;
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