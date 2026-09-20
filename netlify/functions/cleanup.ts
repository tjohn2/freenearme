import {createClient} from "@supabase/supabase-js";
export default async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return new Response("missing service role",{status:500});
 const db=createClient(url,key);
 const now=new Date().toISOString(),oldCommunity=new Date(Date.now()-30*864e5).toISOString();
 await db.from("listing_cache").delete().lt("expires_at",now);
 await db.from("listing_cache").delete().eq("verification_status","source-discovered").lt("updated_at",oldCommunity);
 await db.from("source_health").update({last_status:"stale",updated_at:new Date().toISOString()}).lt("last_checked_at",new Date(Date.now()-2*864e5).toISOString());
 await db.from("job_runs").insert({job_name:"cleanup",status:"ok",finished_at:new Date().toISOString()});return new Response("ok");
};
export const config={schedule:"@daily"};