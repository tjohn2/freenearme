import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function GET(req:NextRequest){
 const token=req.headers.get("x-ops-token")||req.nextUrl.searchParams.get("token")||"";
 if(!process.env.OPS_TOKEN||token!==process.env.OPS_TOKEN)return NextResponse.json({error:"not found"},{status:404});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return NextResponse.json({error:"server config"},{status:500});
 const db=createClient(url,key);
 const [health,subs,claims,feedback,analytics,cache]=await Promise.all([
  db.from("source_health").select("*").order("source_name"),
  db.from("submissions").select("*").eq("status","pending").order("created_at",{ascending:false}).limit(100),
  db.from("organization_claims").select("*").eq("status","pending").order("created_at",{ascending:false}).limit(100),
  db.from("listing_feedback").select("listing_id,feedback,created_at").gte("created_at",new Date(Date.now()-7*864e5).toISOString()).limit(500),
  db.from("analytics_events").select("event_name,listing_id,created_at").gte("created_at",new Date(Date.now()-7*864e5).toISOString()).limit(2000),
  db.from("listing_cache").select("id",{count:"exact",head:true}).gt("expires_at",new Date().toISOString())
 ]);
 const counts:any={};for(const e of analytics.data||[])counts[e.event_name]=(counts[e.event_name]||0)+1;
 return NextResponse.json({source_health:health.data||[],pending_submissions:subs.data||[],organization_claims:claims.data||[],feedback:feedback.data||[],analytics:counts,active_cached_listings:cache.count||0,generated_at:new Date().toISOString()});
}