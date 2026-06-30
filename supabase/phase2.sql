-- Bedbug Map — Phase 2 (reporting / writes). Run AFTER schema.sql (seed.sql optional).
-- Additive and idempotent: safe to run on top of the Phase 1 schema.

create extension if not exists pgcrypto;

-- Optional per-report unit/floor (e.g. "Apt 12", "3rd floor") for multi-unit buildings.
alter table reports add column if not exists unit text;

-- Private config: a secret salt for reporter hashing. RLS on + no policies => anon
-- can never read it, so stored hashes can't be brute-forced back to IPs.
create table if not exists app_config (
  key   text primary key,
  value text not null
);
alter table app_config enable row level security;
insert into app_config(key, value)
values ('reporter_salt', encode(gen_random_bytes(32), 'hex'))
on conflict (key) do nothing;

-- Moderation queue for user-uploaded photos / reports. Flags are reviewed, never auto-applied.
create table if not exists flags (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid references reports(id) on delete cascade,
  reason      text,
  contact     text,
  status      text not null default 'pending' check (status in ('pending','upheld','rejected')),
  created_at  timestamptz default now()
);
alter table flags enable row level security;

-- Recompute the rollup so a photo-backed bedbug report carries more weight
-- ("evidenced"), and expose how many bedbug reports have a photo. The new column
-- is appended LAST so `create or replace view` (and the dependent RPC) stay valid.
create or replace view location_summary as
select
  l.id, l.name, l.address, l.lat, l.lng, l.osm_id,
  count(*) filter (where r.status = 'bedbugs')                            as bedbug_reports,
  count(*) filter (where r.status = 'clean')                             as clean_reports,
  max(r.created_at)                                                      as last_report_at,
  coalesce(sum(
    case when r.status = 'bedbugs'
         then (case when r.photo_url is not null then 1.5 else 1.0 end)
              * greatest(0, 1 - extract(epoch from (now() - r.created_at)) / (60*60*24*540))
         else 0 end), 0)                                                 as weighted_score,
  count(*) filter (where r.status = 'bedbugs' and r.photo_url is not null) as evidenced_reports
from locations l
left join reports r on r.location_id = l.id
group by l.id;

-- Internal: server-side reporter hash from request IP + client session + secret salt.
-- The raw IP is never stored — only this hash. (constraint #3: no PII)
create or replace function _reporter_hash(p_session text)
returns text
language sql
stable
security definer
set search_path = public, extensions
as $$
  select encode(
    digest(
      (select value from app_config where key = 'reporter_salt')
        || '|' || coalesce(
             split_part(
               nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for',
               ',', 1),
             'no-ip')
        || '|' || coalesce(p_session, 'no-session'),
      'sha256'),
    'hex');
$$;
revoke execute on function _reporter_hash(text) from public;

-- Write path: find-or-create the address, enforce rate limits, insert the report.
create or replace function submit_report(
  p_address   text,
  p_lat       double precision,
  p_lng       double precision,
  p_osm_id    text,
  p_status    text,
  p_note      text,
  p_unit      text,
  p_photo_url text,
  p_session   text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_loc  uuid;
begin
  if p_status not in ('bedbugs','clean') then
    raise exception 'Invalid status' using errcode = 'P0001';
  end if;
  if p_address is null or length(trim(p_address)) = 0 then
    raise exception 'Address is required' using errcode = 'P0001';
  end if;

  v_hash := _reporter_hash(p_session);

  -- global cap: max 5 reports per device per hour
  if (select count(*) from reports r
      where r.reporter_hash = v_hash
        and r.created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Too many reports from this device in the last hour. Please try again later.'
      using errcode = 'P0001';
  end if;

  -- find-or-create the address: dedupe by osm_id, else by proximity (~30 m)
  if p_osm_id is not null and length(trim(p_osm_id)) > 0 then
    select id into v_loc from locations where osm_id = p_osm_id limit 1;
  end if;
  if v_loc is null then
    select id into v_loc
    from locations
    where st_dwithin(geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, 30)
    order by st_distance(geom, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
    limit 1;
  end if;
  if v_loc is null then
    insert into locations(address, lat, lng, osm_id)
    values (trim(p_address), p_lat, p_lng, nullif(trim(p_osm_id), ''))
    returning id into v_loc;
  end if;

  -- per-address cap: one report per device per address per 24 h
  if exists (select 1 from reports r
             where r.location_id = v_loc
               and r.reporter_hash = v_hash
               and r.created_at > now() - interval '24 hours') then
    raise exception 'You already reported this address in the last 24 hours.'
      using errcode = 'P0001';
  end if;

  insert into reports(location_id, status, note, unit, photo_url, reporter_hash)
  values (v_loc, p_status,
          nullif(trim(p_note), ''), nullif(trim(p_unit), ''),
          nullif(trim(p_photo_url), ''), v_hash);

  return v_loc;
end;
$$;

-- Recent reports for one address (for the detail panel). Never returns reporter_hash.
create or replace function reports_for_location(p_location_id uuid)
returns table (
  id uuid, status text, note text, unit text, photo_url text, created_at timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select r.id, r.status, r.note, r.unit, r.photo_url, r.created_at
  from reports r
  where r.location_id = p_location_id
  order by r.created_at desc
  limit 50;
$$;

-- Low-key flag/takedown route (queued for moderation; required because user images exist now).
create or replace function flag_report(p_report_id uuid, p_reason text, p_contact text)
returns void
language sql
security definer
set search_path = public, extensions
as $$
  insert into flags(report_id, reason, contact)
  values (p_report_id, nullif(trim(p_reason), ''), nullif(trim(p_contact), ''));
$$;

grant execute on function submit_report(
  text, double precision, double precision, text, text, text, text, text, text
) to anon, authenticated;
grant execute on function reports_for_location(uuid) to anon, authenticated;
grant execute on function flag_report(uuid, text, text) to anon, authenticated;

-- ----------------------------------------------------------------- photo storage
-- Public bucket for report photos. 5 MB cap, images only. EXIF is stripped client-side
-- BEFORE upload (canvas re-encode), so files here carry no GPS metadata.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anon upload report photos" on storage.objects;
create policy "anon upload report photos"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'report-photos');
