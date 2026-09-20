create extension if not exists postgis;
create table if not exists freebies(id uuid primary key default gen_random_uuid(),title text not null,description text,category text not null,venue text,address text,location geography(point,4326) not null,starts_at timestamptz,ends_at timestamptz,expires_at timestamptz,free_type text not null default 'free' check(free_type in ('free','signup','eligible','deal','free_with_purchase','community')),requirements text,source_name text,source_url text,source_id text,verification_status text not null default 'unverified',confidence numeric default .5,last_verified_at timestamptz,image_url text,is_featured boolean not null default false,created_at timestamptz default now(),updated_at timestamptz default now(),eligibility text[] default '{}',recurrence text,offer_kind text,source_tier text not null default 'official',unique(source_name,source_id));
create index if not exists freebies_location_idx on freebies using gist(location);
create table if not exists submissions(id uuid primary key default gen_random_uuid(),title text not null,venue text not null,category text,source_url text,description text,address text,latitude double precision,longitude double precision,starts_at timestamptz,ends_at timestamptz,requirements text,submitter_email text,status text default 'pending',created_at timestamptz default now());
alter table freebies enable row level security;alter table submissions enable row level security;
drop policy if exists "public_read_verified_freebies" on freebies;create policy "public_read_verified_freebies" on freebies for select to anon,authenticated using(verification_status='verified' and(expires_at is null or expires_at>now()));
drop policy if exists "public_submit_freebies" on submissions;create policy "public_submit_freebies" on submissions for insert to anon,authenticated with check(status='pending');
drop function if exists nearby_freebies(double precision,double precision,double precision);
create function nearby_freebies(user_lat double precision,user_lng double precision,radius_miles double precision default 25) returns table(id uuid,title text,description text,category text,venue text,address text,latitude double precision,longitude double precision,distance_miles double precision,starts_at timestamptz,ends_at timestamptz,free_type text,requirements text,source_url text,source_name text,image_url text,verification_status text,last_verified_at timestamptz,is_featured boolean,eligibility text[],recurrence text,offer_kind text,source_tier text) language sql stable security invoker set search_path='' as $$select f.id,f.title,f.description,f.category,f.venue,f.address,public.st_y(f.location::public.geometry),public.st_x(f.location::public.geometry),public.st_distance(f.location,public.st_setsrid(public.st_makepoint(user_lng,user_lat),4326)::public.geography)/1609.344,f.starts_at,f.ends_at,f.free_type,f.requirements,f.source_url,f.source_name,f.image_url,f.verification_status,f.last_verified_at,f.is_featured,f.eligibility,f.recurrence,f.offer_kind,f.source_tier from public.freebies f where public.st_dwithin(f.location,public.st_setsrid(public.st_makepoint(user_lng,user_lat),4326)::public.geography,radius_miles*1609.344) and f.verification_status='verified' and(f.expires_at is null or f.expires_at>now()) order by f.is_featured desc,public.st_distance(f.location,public.st_setsrid(public.st_makepoint(user_lng,user_lat),4326)::public.geography) limit 400;$$;
grant execute on function nearby_freebies(double precision,double precision,double precision) to anon,authenticated;

create table if not exists listing_feedback(id uuid primary key default gen_random_uuid(),listing_id text not null,feedback text not null check(feedback in ('active','gone','inaccurate')),source_url text,created_at timestamptz not null default now());
alter table listing_feedback enable row level security;
drop policy if exists "public_submit_listing_feedback" on listing_feedback;
create policy "public_submit_listing_feedback" on listing_feedback for insert to anon,authenticated with check(feedback in ('active','gone','inaccurate'));
revoke select on listing_feedback from anon,authenticated;
grant insert on listing_feedback to anon,authenticated;


-- Scale foundation: canonical programs, cached shareable listings, accounts, alerts, analytics, org onboarding, ops.
create table if not exists programs(
  id text primary key,title text not null,description text,category text not null,
  free_type text not null check(free_type in ('free','signup','eligible','deal','free_with_purchase','community')),
  requirements text,source_url text not null,source_name text not null,eligibility text[] not null default '{}',
  recurrence text,offer_kind text,source_tier text not null default 'official',
  verification_status text not null default 'source-verified',active boolean not null default true,
  starts_at timestamptz,ends_at timestamptz,scope text not null default 'national',updated_at timestamptz not null default now()
);
alter table programs enable row level security;
drop policy if exists "public_read_programs" on programs;
create policy "public_read_programs" on programs for select to anon,authenticated using(active=true);
grant select on programs to anon,authenticated;

create table if not exists program_locations(
 id uuid primary key default gen_random_uuid(),program_id text not null references programs(id) on delete cascade,
 source_location_id text,venue text not null,address text,location geography(point,4326),active boolean not null default true,
 updated_at timestamptz not null default now(),unique(program_id,source_location_id)
);
create index if not exists program_locations_location_idx on program_locations using gist(location);
alter table program_locations enable row level security;
drop policy if exists "public_read_program_locations" on program_locations;
create policy "public_read_program_locations" on program_locations for select to anon,authenticated using(active=true);
grant select on program_locations to anon,authenticated;

create table if not exists listing_cache(
 id text primary key,title text not null,category text not null,venue text,item jsonb not null,latitude double precision,
 longitude double precision,starts_at timestamptz,ends_at timestamptz,free_type text,source_url text,verification_status text,
 expires_at timestamptz not null default(now()+interval '14 days'),source_checked_at timestamptz,source_http_status integer,updated_at timestamptz not null default now()
);
create index if not exists listing_cache_expires_idx on listing_cache(expires_at);
alter table listing_cache enable row level security;
drop policy if exists "public_read_listing_cache" on listing_cache;
create policy "public_read_listing_cache" on listing_cache for select to anon,authenticated using(expires_at>now());
grant select on listing_cache to anon,authenticated;

create table if not exists user_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,display_name text,home_lat double precision,home_lng double precision,
 radius_miles integer not null default 25 check(radius_miles between 1 and 100),interests text[] not null default '{}',updated_at timestamptz not null default now()
);
alter table user_preferences enable row level security;
drop policy if exists "own_preferences" on user_preferences;
create policy "own_preferences" on user_preferences for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,update,delete on user_preferences to authenticated;

create table if not exists saved_items(
 user_id uuid not null references auth.users(id) on delete cascade,listing_id text not null,created_at timestamptz not null default now(),
 primary key(user_id,listing_id)
);
alter table saved_items enable row level security;
drop policy if exists "own_saved_items" on saved_items;
create policy "own_saved_items" on saved_items for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,delete on saved_items to authenticated;

create table if not exists alert_subscriptions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 radius_miles integer not null default 10 check(radius_miles between 1 and 100),categories text[] not null default '{}',
 enabled boolean not null default true,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table alert_subscriptions enable row level security;
drop policy if exists "own_alerts" on alert_subscriptions;
create policy "own_alerts" on alert_subscriptions for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,update,delete on alert_subscriptions to authenticated;

create table if not exists analytics_events(
 id bigserial primary key,anonymous_id text,user_id uuid,event_name text not null check(char_length(event_name) between 1 and 80),
 listing_id text,metadata jsonb not null default '{}',created_at timestamptz not null default now()
);
alter table analytics_events enable row level security;
drop policy if exists "public_insert_analytics" on analytics_events;
create policy "public_insert_analytics" on analytics_events for insert to anon,authenticated with check(user_id is null or user_id=auth.uid());
revoke select on analytics_events from anon,authenticated; grant insert on analytics_events to anon,authenticated;

create table if not exists organization_claims(
 id uuid primary key default gen_random_uuid(),organization_name text not null,website text,contact_email text not null,message text,
 status text not null default 'pending' check(status in ('pending','approved','rejected')),created_at timestamptz not null default now()
);
alter table organization_claims enable row level security;
drop policy if exists "public_submit_organization_claims" on organization_claims;
create policy "public_submit_organization_claims" on organization_claims for insert to anon,authenticated with check(status='pending');
revoke select on organization_claims from anon,authenticated;grant insert on organization_claims to anon,authenticated;

create table if not exists source_health(
 source_name text primary key,enabled boolean not null default true,result_count integer not null default 0,last_status text not null default 'unknown',
 last_checked_at timestamptz,last_error text,updated_at timestamptz not null default now()
);
alter table source_health enable row level security;revoke all on source_health from anon,authenticated;

create table if not exists promotions(
 id uuid primary key default gen_random_uuid(),organization_name text not null,title text not null,destination_url text not null,
 label text not null default 'Sponsored',active boolean not null default false,starts_at timestamptz,ends_at timestamptz,created_at timestamptz not null default now()
);
alter table promotions enable row level security;
drop policy if exists "public_read_active_promotions" on promotions;
create policy "public_read_active_promotions" on promotions for select to anon,authenticated using(active=true and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>=now()));
grant select on promotions to anon,authenticated;


create table if not exists source_registry(
  id text primary key,
  name text not null,
  source_type text not null check(source_type in ('localist','ucf_json','tribe')),
  url text not null,
  latitude double precision not null,
  longitude double precision not null,
  coverage_miles integer not null default 50 check(coverage_miles between 1 and 250),
  trust_tier text not null default 'official',
  free_policy text not null default 'explicit_only',
  active boolean not null default true,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table source_registry enable row level security;
drop policy if exists "public_read_source_registry" on source_registry;
create policy "public_read_source_registry" on source_registry for select to anon,authenticated using(active=true);
grant select on source_registry to anon,authenticated;
