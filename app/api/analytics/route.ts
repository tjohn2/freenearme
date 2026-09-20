import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function POST(req:NextRequest){
  try{
    const b=await req.json();
    const event_name=String(b.event_name||"").slice(0,80);
    if(!event_name)return NextResponse.json({ok:false},{status:400});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co";
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_twXglFUicR3kgQ3fTO3pJA_Ji3qwIwm";
    const db=createClient(url,key);
    await db.from("analytics_events").insert({
      anonymous_id:b.anonymous_id?String(b.anonymous_id).slice(0,120):null,
      event_name,
      listing_id:b.listing_id?String(b.listing_id).slice(0,300):null,
      session_id:b.session_id?String(b.session_id).slice(0,120):null,
      area_id:b.area_id?String(b.area_id).slice(0,120):null,
      latitude_bucket:Number.isFinite(Number(b.latitude_bucket))?Number(b.latitude_bucket):null,
      longitude_bucket:Number.isFinite(Number(b.longitude_bucket))?Number(b.longitude_bucket):null,
      metadata:typeof b.metadata==="object"&&b.metadata?b.metadata:{}
    });
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({ok:false},{status:400})}
}