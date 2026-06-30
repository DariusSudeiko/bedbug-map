-- Bedbug Map — schema (Phase 0)
-- Run once per Supabase project, in the SQL editor (Dashboard → SQL Editor → New query).

create extension if not exists postgis;

-- ------------------------------------------------------------------ locations
create table if not exists locations (
  id          uuid primary key default gen_random_uuid(),
  name        text,                       -- hotel/property name; null for a plain address
  address     text not null,
  lat         double precision not null,
  lng         double precision not null,
  geom        geography(Point, 4326)
              generated always as (st_setsrid(st_makepoint(lng, lat), 4326)::geography) stored,
  osm_id      text,                       -- dedupe key against Nominatim results
  created_at  timestamptz default now()
);
create index if not exists locations_geom_idx on locations using gist (geom);

-- -------------------------------------------------------------------- reports
create table if not exists reports (
  id            uuid primary key default gen_random_uuid(),
  location_id   uuid references locations(id) on delete cascade,
  status        text not null check (status in ('bedbugs','clean')),
  note          text,
  photo_url     text,
  reporter_hash text not null,            -- salted hash of IP+session, NOT PII
  created_at    timestamptz default now()
);
create index if not exists reports_location_idx on reports(location_id);
create index if not exists reports_reporter_idx on reports(reporter_hash);

-- ------------------------------------------------------------ rollup for the map
-- weighted_score = recency-decayed count of 'bedbugs' reports:
-- a fresh report counts ~1, a ~18-month-old one ≈ 0. Drives confidence + fade.
create or replace view location_summary as
select
  l.id, l.name, l.address, l.lat, l.lng, l.osm_id,
  count(*) filter (where r.status = 'bedbugs')                            as bedbug_reports,
  count(*) filter (where r.status = 'clean')                             as clean_reports,
  max(r.created_at)                                                      as last_report_at,
  coalesce(sum(
    case when r.status = 'bedbugs'
         then greatest(0, 1 - extract(epoch from (now() - r.created_at)) / (60*60*24*540))
         else 0 end), 0)                                                 as weighted_score
from locations l
left join reports r on r.location_id = l.id
group by l.id;

-- ---------------------------------------------------- viewport query (the map RPC)
-- Called on every pan/zoom. `&&` uses the GiST index on geom, so it scales worldwide.
create or replace function reports_in_bounds(
  min_lat double precision,
  min_lng double precision,
  max_lat double precision,
  max_lng double precision
)
returns setof location_summary
language sql
stable
security definer
set search_path = public
as $$
  select s.*
  from location_summary s
  join locations l on l.id = s.id
  where l.geom && st_makeenvelope(min_lng, min_lat, max_lng, max_lat, 4326)::geography;
$$;

-- ----------------------------------------------------------------------- access
-- Lock the base tables down. The public web client (anon) reaches data ONLY
-- through reports_in_bounds(), which runs as the function owner (security
-- definer) and returns summary rows only — reporter_hash is never exposed.
-- Write policies / rate limiting arrive in Phase 2.
alter table locations enable row level security;
alter table reports   enable row level security;

grant execute on function reports_in_bounds(
  double precision, double precision, double precision, double precision
) to anon, authenticated;
