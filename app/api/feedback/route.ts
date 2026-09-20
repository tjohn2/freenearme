import {NextRequest,NextResponse} from "next/server";
import {createClient} from "@supabase/supabase-js";
export async function POST(req:NextRequest){
  try{
    const body=await req.json();
    const listing_id=String(body.listing_id||"").slice(0,300);
    const feedback=String(body.feedback||"");
    const source_url=body.source_url?String(body.source_url).slice(0,1000):null;
    if(!listing_id||!["active","gone","inaccurate"].includes(feedback))return NextResponse.json({ok:false},{status:400});
    const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co";
    const key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"sb_publishable_twXglFUicR3kgQ3fTO3pJA_Ji3qwIwm";
    const db=createClient(url,key);
    const {error}=await db.from("listing_feedback").insert({listing_id,feedback,source_url});
    if(error)return NextResponse.json({ok:false},{status:500});
    return NextResponse.json({ok:true});
  }catch{return NextResponse.json({ok:false},{status:400})}
}
