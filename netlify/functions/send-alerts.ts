import {createClient} from "@supabase/supabase-js";
export default async()=>{
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL||"https://pixlqytdhgxcfgagwijy.supabase.co",key=process.env.SUPABASE_SERVICE_ROLE_KEY,resend=process.env.RESEND_API_KEY,site=process.env.SITE_URL||"https://freenearme.netlify.app";
 if(!key)return new Response("missing service role",{status:500});
 const db=createClient(url,key);const{data:alerts}=await db.from("alert_subscriptions").select("id,user_id,radius_miles,categories,last_listing_ids,last_notified_at").eq("enabled",true);let sent=0;
 for(const a of alerts||[]){const{data:p}=await db.from("user_preferences").select("home_lat,home_lng").eq("user_id",a.user_id).maybeSingle();if(!Number.isFinite(Number(p?.home_lat))||!Number.isFinite(Number(p?.home_lng)))continue;
  const{data:rows}=await db.rpc("nearby_cached_listings",{user_lat:Number(p.home_lat),user_lng:Number(p.home_lng),radius_miles:Number(a.radius_miles||10)});let items=(rows||[]).map((r:any)=>r.item).filter(Boolean);
  const cats=(a.categories||[]).map((x:string)=>x.toLowerCase());if(cats.length)items=items.filter((x:any)=>cats.includes(String(x.category||"").toLowerCase())||cats.some((c:string)=>String(x.offer_kind||"").toLowerCase().includes(c.replace(/ & /g,"_"))));
  const seen=new Set(a.last_listing_ids||[]),fresh=items.filter((x:any)=>!seen.has(x.id)).slice(0,8);if(!fresh.length)continue;
  if(resend){const{data:u}=await db.auth.admin.getUserById(a.user_id);const email=u?.user?.email;if(email){const body=fresh.map((x:any)=>"<li><a href=\""+site+(x.detail_url||("/find/"+encodeURIComponent(x.id)))+"\">"+String(x.title).replace(/[<>&]/g,"")+"</a> — "+String(x.venue||"Nearby").replace(/[<>&]/g,"")+"</li>").join("");const rr=await fetch("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+resend,"Content-Type":"application/json"},body:JSON.stringify({from:process.env.ALERT_FROM_EMAIL||"Free Near Me <alerts@freenearme.app>",to:[email],subject:fresh.length+" new free find"+(fresh.length===1?"":"s")+" near you",html:"<h1>New free finds near you</h1><ul>"+body+"</ul><p><a href=\""+site+"\">Open Free Near Me</a></p>"})});if(rr.ok)sent++}}
  await db.from("alert_subscriptions").update({last_listing_ids:items.slice(0,100).map((x:any)=>x.id),last_notified_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq("id",a.id);
 }
 return new Response(JSON.stringify({ok:true,sent,transport:resend?"resend":"not-configured"}),{headers:{"content-type":"application/json"}});
};
export const config={schedule:"0 14 * * *"};