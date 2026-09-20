import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function GET(req:NextRequest){
 const token=req.headers.get("x-ops-token")||req.nextUrl.searchParams.get("token")||"";
 if(!process.env.OPS_TOKEN||token!==process.env.OPS_TOKEN)return NextResponse.json({error:"not found"},{status:404});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key)return NextResponse.json({error:"server config"},{status:500});
 const db=createClient(url,key);
 const [health,subs,claims,feedback,analytics,cache,registry,errors,audit,metros,jobs]=await Promise.all([
  db.from("source_health").select("*").order("source_name"),
  db.from("submissions").select("*").eq("status","pending").order("created_at",{ascending:false}).limit(100),
  db.from("organization_claims").select("*").eq("status","pending").order("created_at",{ascending:false}).limit(100),
  db.from("listing_feedback").select("id,listing_id,feedback,created_at").gte("created_at",new Date(Date.now()-7*864e5).toISOString()).limit(500),
  db.from("analytics_events").select("event_name,listing_id,created_at").gte("created_at",new Date(Date.now()-7*864e5).toISOString()).limit(2000),
  db.from("listing_cache").select("id",{count:"exact",head:true}).gt("expires_at",new Date().toISOString()),
  db.from("source_registry").select("id,name,source_type,url,latitude,longitude,coverage_miles,active,last_verified_at").order("name"),
  db.from("client_errors").select("message,path,created_at").gte("created_at",new Date(Date.now()-7*864e5).toISOString()).order("created_at",{ascending:false}).limit(100),
  db.from("moderation_audit").select("*").order("created_at",{ascending:false}).limit(100),
  db.from("metro_inventory").select("*").order("priority").limit(100),
  db.from("job_runs").select("job_name,status,processed,detail,finished_at").order("finished_at",{ascending:false}).limit(30)
 ]);
 const counts:any={};for(const e of analytics.data||[])counts[e.event_name]=(counts[e.event_name]||0)+1;
 return NextResponse.json({source_health:health.data||[],source_registry:registry.data||[],pending_submissions:subs.data||[],organization_claims:claims.data||[],feedback:feedback.data||[],client_errors:errors.data||[],moderation_audit:audit.data||[],metro_inventory:metros.data||[],job_runs:jobs.data||[],analytics:counts,active_cached_listings:cache.count||0,generated_at:new Date().toISOString()});
}
export async function POST(req:NextRequest){
 const token=req.headers.get("x-ops-token")||"";if(!process.env.OPS_TOKEN||token!==process.env.OPS_TOKEN)return NextResponse.json({error:"not found"},{status:404});
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return NextResponse.json({error:"server config"},{status:500});const db=createClient(url,key);
 try{const b=await req.json();
  if(b.operation==="moderate"){const action=String(b.action||""),target_type=String(b.target_type||""),id=String(b.id||"");if(!["approve","reject","remove","confirm"].includes(action)||!["submission","claim","feedback"].includes(target_type)||!id)return NextResponse.json({error:"invalid moderation action"},{status:400});
   if(target_type==="submission"){const{data:s}=await db.from("submissions").select("*").eq("id",id).maybeSingle();if(!s)return NextResponse.json({error:"submission not found"},{status:404});if(action==="approve"){if(!Number.isFinite(Number(s.latitude))||!Number.isFinite(Number(s.longitude)))return NextResponse.json({error:"submission needs coordinates before approval"},{status:400});await db.from("freebies").insert({title:s.title,description:s.description,category:s.category||"Events",venue:s.venue,address:s.address,location:"POINT("+Number(s.longitude)+" "+Number(s.latitude)+")",starts_at:s.starts_at,ends_at:s.ends_at,expires_at:s.ends_at||null,free_type:"community",requirements:s.requirements,source_name:"Community submission",source_url:s.source_url,source_id:"submission:"+s.id,verification_status:"verified",confidence:.75,last_verified_at:new Date().toISOString(),source_tier:"community"});await db.from("submissions").update({status:"approved"}).eq("id",id)}else await db.from("submissions").update({status:"rejected"}).eq("id",id)}
   if(target_type==="claim"){const{data:claim}=await db.from("organization_claims").select("*").eq("id",id).maybeSingle();if(action==="approve"&&claim){const{data:org}=await db.from("organizations").insert({name:claim.organization_name,website:claim.website||null,status:"approved"}).select("id").single();if(org&&claim.user_id)await db.from("organization_members").upsert({organization_id:org.id,user_id:claim.user_id,role:"owner"},{onConflict:"organization_id,user_id"})}await db.from("organization_claims").update({status:action==="approve"?"approved":"rejected"}).eq("id",id)}
   if(target_type==="feedback"){const{data:fb}=await db.from("listing_feedback").select("*").eq("id",id).maybeSingle();if(fb&&(action==="remove"||fb.feedback==="gone"||fb.feedback==="inaccurate"))await db.from("listing_cache").delete().eq("id",fb.listing_id)}
   await db.from("moderation_audit").insert({action,target_type,target_id:id,note:b.note?String(b.note).slice(0,500):null});return NextResponse.json({ok:true});
  }
  const id=String(b.id||"").toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,80),name=String(b.name||"").slice(0,160),source_type=String(b.source_type||""),sourceUrl=new URL(String(b.url||"")),latitude=Number(b.latitude),longitude=Number(b.longitude),coverage_miles=Math.max(1,Math.min(250,Number(b.coverage_miles||50)));if(!id||!name||!["localist","ucf_json","tribe","umich_json"].includes(source_type)||!Number.isFinite(latitude)||!Number.isFinite(longitude)||sourceUrl.protocol!=="https:")return NextResponse.json({error:"invalid source"},{status:400});const{error}=await db.from("source_registry").upsert({id,name,source_type,url:sourceUrl.toString(),latitude,longitude,coverage_miles,trust_tier:"official",free_policy:"explicit_only",active:true,last_verified_at:null,updated_at:new Date().toISOString()},{onConflict:"id"});if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true,id})
 }catch{return NextResponse.json({error:"bad request"},{status:400})}
}