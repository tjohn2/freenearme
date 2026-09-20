import {NextRequest,NextResponse} from "next/server";
export async function GET(req:NextRequest){
  const q=(req.nextUrl.searchParams.get("q")||"").trim();
  if(q.length<2)return NextResponse.json({items:[]});
  try{
    const u=new URL("https://nominatim.openstreetmap.org/search");
    u.searchParams.set("q",q);
    u.searchParams.set("format","jsonv2");
    u.searchParams.set("countrycodes","us");
    u.searchParams.set("limit","5");
    u.searchParams.set("addressdetails","1");
    const r=await fetch(u,{headers:{"User-Agent":"FreeNearMe/1.0 (location search)","Accept-Language":"en-US"},next:{revalidate:86400}});
    if(!r.ok)return NextResponse.json({items:[]});
    const rows=await r.json();
    return NextResponse.json({items:(rows||[]).map((x:any)=>({label:x.display_name,lat:Number(x.lat),lng:Number(x.lon),type:x.type}))});
  }catch{return NextResponse.json({items:[]})}
}
