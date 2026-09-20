import {createClient} from "@supabase/supabase-js";
const norm=(s:any)=>String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
export default async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return new Response("missing service role",{status:500});const db=createClient(url,key);
 const{data}=await db.from("listing_cache").select("id,title,venue,starts_at,verification_status,source_url,updated_at").gt("expires_at",new Date().toISOString()).limit(5000);const groups=new Map<string,any[]>();for(const x of data||[]){const day=x.starts_at?String(x.starts_at).slice(0,10):"evergreen",k=norm(x.title)+"|"+norm(x.venue)+"|"+day;groups.set(k,[...(groups.get(k)||[]),x])}let removed=0;
 for(const g of groups.values()){if(g.length<2)continue;g.sort((a,b)=>{const score=(x:any)=>(x.verification_status==="verified"?3:x.verification_status==="source-verified"?2:1)+(x.source_url?1:0);return score(b)-score(a)||new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime()});const ids=g.slice(1).map(x=>x.id);if(ids.length){await db.from("listing_cache").delete().in("id",ids);removed+=ids.length}}
 return new Response(JSON.stringify({ok:true,removed}),{headers:{"content-type":"application/json"}});
};
export const config={schedule:"20 */2 * * *"};