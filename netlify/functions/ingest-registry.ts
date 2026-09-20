import {createClient} from "@supabase/supabase-js";
const clean=(v:any)=>String(v||"").replace(/<[^>]*>/g," ").replace(/&nbsp;|&#160;/g," ").replace(/&amp;/g,"&").replace(/\s+/g," ").trim();
const explicitFree=(...xs:any[])=>{const t=xs.map(clean).join(" ").toLowerCase();return /(^|\b)(free admission|admission is free|event is free|free event|cost:?\s*free|fee:?\s*free|\$0|no charge|complimentary)(\b|$)/i.test(t)||xs.some(x=>typeof x==="string"&&/^\s*free\s*$/i.test(x))};
const eligibleFree=(...xs:any[])=>/free for (current )?(students|members|faculty|staff|veterans|military|children|kids)|free to (all )?[a-z ]*students/i.test(xs.map(clean).join(" "));
const classify=(s:string)=>{const t=s.toLowerCase();if(/kid|child|family|storytime|craft/.test(t))return"Kids";if(/free food|pizza|coffee|meal|snack|treat/.test(t))return"Food & Treats";if(/run|walk|yoga|fitness|dance|hike|bike|sport|recreation/.test(t))return"Activities";if(/museum|gallery|exhibit|admission/.test(t))return"Places";return"Events"};
const point=(lng:number,lat:number)=>"POINT("+lng+" "+lat+")";
function coordsFromUrl(u:any){const m=String(u||"").match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);return m?{lat:Number(m[1]),lng:Number(m[2])}:null}
async function load(src:any){
 try{
  if(src.source_type==="localist"){
   const u=new URL(src.url);u.searchParams.set("days","120");u.searchParams.set("pp","100");u.searchParams.set("sort","date");u.searchParams.set("direction","asc");
   const r=await fetch(u,{headers:{"User-Agent":"FreeNearMe/1.0 registry ingester"}});if(!r.ok)return[];
   const j=await r.json();return(j.events||[]).map((w:any)=>w.event||w).filter((e:any)=>explicitFree(e.cost,e.description,e.title,JSON.stringify(e.filters||e.tags||""))||eligibleFree(e.description,e.title,JSON.stringify(e.filters||e.tags||""))).map((e:any)=>{
    const inst=e.event_instances?.[0]?.event_instance||{},geo=e.geo||e.venue?.geo||{},lat=Number(geo.latitude??geo.lat??e.latitude??e.venue?.latitude),lng=Number(geo.longitude??geo.lng??e.longitude??e.venue?.longitude),txt=[e.title,e.description,JSON.stringify(e.filters||e.tags||"")].map(clean).join(" "),elig=eligibleFree(txt);
    return{id:"localist:"+src.id+":"+e.id,title:clean(e.title),description:clean(e.description).slice(0,700),category:classify(txt),venue:clean(e.venue?.name||e.location_name||e.place?.name||src.name),address:clean(e.address||e.venue?.address||e.place?.address),latitude:lat,longitude:lng,starts_at:inst.start||e.start||e.start_date||null,ends_at:inst.end||e.end||e.end_date||null,free_type:elig?"eligible":"free",requirements:elig?"Free only for the eligible audience named by the organizer. Check registration and access rules.":"Organizer explicitly marks this event free. Check registration and access rules.",source_url:e.localist_url||e.url,source_name:src.name,image_url:e.photo_url||e.photo?.url,verification_status:"source-verified",offer_kind:"event",source_tier:"official"};
   })
  }
  if(src.source_type==="ucf_json"){
   const r=await fetch(src.url,{headers:{"User-Agent":"FreeNearMe/1.0 registry ingester"}});if(!r.ok)return[];const rows=await r.json();
   return(rows||[]).filter((e:any)=>explicitFree(e.title,e.description,(e.tags||[]).join(" "))||eligibleFree(e.title,e.description,(e.tags||[]).join(" "))).map((e:any)=>{const p=coordsFromUrl(e.location_url),txt=[e.title,e.description,(e.tags||[]).join(" ")].map(clean).join(" "),elig=eligibleFree(txt);return{id:"ucf:"+e.id,title:clean(e.title),description:clean(e.description).slice(0,700),category:classify(txt),venue:clean(e.location||"UCF"),latitude:p?.lat,longitude:p?.lng,starts_at:e.starts||null,ends_at:e.ends||null,free_type:elig?"eligible":"free",requirements:elig?"Organizer limits the free offer to an eligible UCF audience.":"Organizer explicitly describes a free event or free item.",source_url:e.url,source_name:src.name,verification_status:"source-verified",offer_kind:/free food/i.test(txt)?"event_with_free_food":"event",source_tier:"official"}});
  }
  if(src.source_type==="tribe"){
   const u=new URL(src.url);u.searchParams.set("per_page","100");u.searchParams.set("start_date",new Date().toISOString().slice(0,10));u.searchParams.set("end_date",new Date(Date.now()+120*864e5).toISOString().slice(0,10));
   const r=await fetch(u,{headers:{"User-Agent":"FreeNearMe/1.0 registry ingester"}});if(!r.ok)return[];const j=await r.json();
   return(j.events||[]).filter((e:any)=>explicitFree(e.cost,e.description,e.title)).map((e:any)=>{const v=e.venue||{},lat=Number(v.geo_lat??v.latitude??e.geo_lat),lng=Number(v.geo_lng??v.longitude??e.geo_lng),txt=[e.title,e.description,e.categories?.map((x:any)=>x.name).join(" ")].map(clean).join(" ");return{id:"tribe:"+src.id+":"+e.id,title:clean(e.title),description:clean(e.description).slice(0,700),category:classify(txt),venue:clean(v.venue||v.name||src.name),address:clean(v.address||[v.city,v.state,v.zip].filter(Boolean).join(", ")),latitude:lat,longitude:lng,starts_at:e.start_date||null,ends_at:e.end_date||null,free_type:"free",requirements:"Official calendar marks this event free. Check registration and venue rules.",source_url:e.url,source_name:src.name,image_url:e.image?.url,verification_status:"source-verified",offer_kind:"event",source_tier:"official"}});
  }
 }catch{}
 return[];
}
export default async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)return new Response("missing service role",{status:500});
 const db=createClient(url,key);const{data:sources}=await db.from("source_registry").select("*").eq("active",true);let total=0;
 for(let i=0;i<(sources||[]).length;i+=4){
  const batch=(sources||[]).slice(i,i+4);const sets=await Promise.all(batch.map(load));
  for(let k=0;k<batch.length;k++){const src=batch[k],items=(sets[k]||[]).filter((x:any)=>Number.isFinite(Number(x.latitude))&&Number.isFinite(Number(x.longitude)));if(items.length){const rows=items.map((x:any)=>({id:x.id,title:x.title,category:x.category,venue:x.venue||null,item:{...x,distance_miles:0,detail_url:"/find/"+encodeURIComponent(x.id)},latitude:Number(x.latitude),longitude:Number(x.longitude),location:point(Number(x.longitude),Number(x.latitude)),starts_at:x.starts_at||null,ends_at:x.ends_at||null,free_type:x.free_type,source_url:x.source_url||null,verification_status:x.verification_status,expires_at:x.ends_at||x.starts_at?new Date(Math.max(Date.now()+864e5,new Date(x.ends_at||x.starts_at).getTime()+2*864e5)).toISOString():new Date(Date.now()+14*864e5).toISOString(),updated_at:new Date().toISOString()}));await db.from("listing_cache").upsert(rows,{onConflict:"id"});total+=rows.length}await db.from("source_health").upsert({source_name:src.id,result_count:items.length,last_status:"ok",last_checked_at:new Date().toISOString(),last_error:null,updated_at:new Date().toISOString()},{onConflict:"source_name"})}
 }
 return new Response(JSON.stringify({ok:true,total,sources:(sources||[]).length}),{headers:{"content-type":"application/json"}});
};
export const config={schedule:"0 */2 * * *"};