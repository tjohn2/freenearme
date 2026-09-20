import {createClient} from "@supabase/supabase-js";
export default async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY,site=process.env.SITE_URL||"https://freenearme.netlify.app";if(!key)return new Response("missing service role",{status:500});const db=createClient(url,key);
 const{data:metros}=await db.from("metro_targets").select("*").eq("active",true).order("last_warmed_at",{ascending:true,nullsFirst:true}).order("priority").limit(8);let warmed=0,failed=0;
 for(const m of metros||[]){try{const u=site+"/api/nearby?lat="+m.latitude+"&lng="+m.longitude+"&radius=25";const ctrl=new AbortController(),t=setTimeout(()=>ctrl.abort(),12000);const r=await fetch(u,{headers:{"User-Agent":"FreeNearMe/1.0 metro warmer"},signal:ctrl.signal});clearTimeout(t);if(r.ok){warmed++;await db.from("metro_targets").update({last_warmed_at:new Date().toISOString()}).eq("slug",m.slug)}else failed++}catch{failed++}}
 await db.from("job_runs").insert({job_name:"warm-metros",status:failed?"partial":"ok",processed:warmed,detail:{failed},finished_at:new Date().toISOString()});return new Response(JSON.stringify({ok:true,warmed,failed}),{headers:{"content-type":"application/json"}});
};
export const config={schedule:"40 */2 * * *"};