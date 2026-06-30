-- Bedbug Map — development seed data (FAKE). Run after schema.sql.
-- Re-runnable: it clears existing rows first. Do NOT run against production.
truncate reports, locations restart identity cascade;

insert into locations (name, address, lat, lng, osm_id) values
  ('Hotel Senamiestis',          'Pilies g. 10, Vilnius',          54.6796, 25.2879, 'seed-1'),
  ('Vilnius Airport Inn',        'Rodūnios kelias 8, Vilnius',     54.6341, 25.2858, 'seed-2'),
  ('Kaunas Central Hostel',      'Laisvės al. 50, Kaunas',         54.8985, 23.9036, 'seed-3'),
  ('Klaipėda Old Port Rooms',    'Naujoji Sodo g. 1, Klaipėda',    55.7033, 21.1443, 'seed-4'),
  ('Šiauliai City Hotel',        'Tilžės g. 100, Šiauliai',        55.9349, 23.3137, 'seed-5'),
  ('Panevėžys Rental Flat',      'Respublikos g. 40, Panevėžys',   55.7333, 24.3500, 'seed-6'),
  ('Druskininkai Spa Resort',    'Vilniaus al. 11, Druskininkai',  54.0150, 23.9700, 'seed-7'),
  ('Trakai Lakeside Guesthouse', 'Karaimų g. 30, Trakai',          54.6379, 24.9347, 'seed-8'),
  ('Kaunas Riverside Apt',       'Nemuno krantinė 5, Kaunas',      54.9050, 23.9700, 'seed-9'),
  (null,                         'Gedimino pr. 1, Vilnius',        54.6872, 25.2797, 'seed-10');

-- seed-1: HEAVY — 5 recent bedbug reports (days 1..5)
insert into reports (location_id, status, note, reporter_hash, created_at)
select id, 'bedbugs', 'Bites on arms, found a bug in the mattress seam', md5('seed1-' || g), now() - (g || ' days')::interval
from locations, generate_series(1, 5) g where osm_id = 'seed-1';

-- seed-2: HEAVY — 5 recent bedbug reports (days 3,6,9,12,15)
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'bedbugs', md5('seed2-' || g), now() - (g * 3 || ' days')::interval
from locations, generate_series(1, 5) g where osm_id = 'seed-2';

-- seed-3: SEVERAL — 2 recent bedbug reports (days 20,40)
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'bedbugs', md5('seed3-' || g), now() - (g * 20 || ' days')::interval
from locations, generate_series(1, 2) g where osm_id = 'seed-3';

-- seed-4: SINGLE — 1 recent bedbug report
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'bedbugs', md5('seed4-1'), now() - interval '10 days'
from locations where osm_id = 'seed-4';

-- seed-5: CLEAN — 3 clean reports
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'clean', md5('seed5-' || g), now() - (g * 15 || ' days')::interval
from locations, generate_series(1, 3) g where osm_id = 'seed-5';

-- seed-6: STALE — 1 bedbug report ~600 days ago (fully decayed → faded, "no current reports")
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'bedbugs', md5('seed6-1'), now() - interval '600 days'
from locations where osm_id = 'seed-6';

-- seed-7: CLEAN — 2 recent clean reports
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'clean', md5('seed7-' || g), now() - (g * 5 || ' days')::interval
from locations, generate_series(1, 2) g where osm_id = 'seed-7';

-- seed-8: SINGLE — 1 bedbug report ~90 days ago
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'bedbugs', md5('seed8-1'), now() - interval '90 days'
from locations where osm_id = 'seed-8';

-- seed-9: RECOVERING — 2 old bedbug (~1yr, low weight) + 3 recent clean (counter-evidence)
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'bedbugs', md5('seed9b-' || g), now() - interval '360 days' - (g || ' days')::interval
from locations, generate_series(1, 2) g where osm_id = 'seed-9';
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'clean', md5('seed9c-' || g), now() - (g * 4 || ' days')::interval
from locations, generate_series(1, 3) g where osm_id = 'seed-9';

-- seed-10: SINGLE — 1 recent bedbug report (plain address, no property name)
insert into reports (location_id, status, reporter_hash, created_at)
select id, 'bedbugs', md5('seed10-1'), now() - interval '5 days'
from locations where osm_id = 'seed-10';
