-- Bedbug Map — Phase 3 (credibility layer). Run AFTER schema.sql + phase2.sql.
-- Additive and idempotent.

-- Latest reports nationwide (for the "Recent reports" side feed). No reporter_hash.
create or replace function recent_reports(p_limit int default 20)
returns table (
  report_id   uuid,
  location_id uuid,
  address     text,
  lat         double precision,
  lng         double precision,
  status      text,
  note        text,
  photo_url   text,
  created_at  timestamptz
)
language sql
stable
security definer
set search_path = public, extensions
as $$
  select r.id, l.id, l.address, l.lat, l.lng, r.status, r.note, r.photo_url, r.created_at
  from reports r
  join locations l on l.id = r.location_id
  order by r.created_at desc
  limit greatest(1, least(coalesce(p_limit, 20), 100));
$$;

-- One summary row by id (used when a feed item is clicked, to open its detail panel).
create or replace function location_summary_by_id(p_id uuid)
returns setof location_summary
language sql
stable
security definer
set search_path = public, extensions
as $$
  select * from location_summary where id = p_id;
$$;

grant execute on function recent_reports(int) to anon, authenticated;
grant execute on function location_summary_by_id(uuid) to anon, authenticated;
