# Bedbug Map — Build Brief

A crowdsourced map where anyone can mark an address (hotel, rental, apartment) as
having bedbugs or being clean. Lithuania first; architecture is global from day one
so "worldwide" is a config change, not a rewrite. Free to use, one unobtrusive ad/affiliate
slot for revenue.

---

## 0. Non-negotiable constraints (read before writing any code)

1. **Never brand a location off a single report.** Show a *confidence level* derived from
   report count + recency, not a binary "infested" flag.
2. **Recency decay is mandatory.** A report older than ~12–18 months is de-emphasised and fades.
3. **Store no PII.** Rate-limiting/dedup uses a salted hash of IP+session, never the raw IP.
   No accounts required in MVP.
4. **Every report is labelled "user-reported, unverified" in the UI.** Always visible.
5. **A dispute / takedown path must exist** (Phase 2). Legal shield under the EU DSA.
6. **No paid map or geocoding APIs in MVP.** Free OSM tiles + Nominatim.

---

## 1. Stack (decided)

Frontend Vite + React + TS · Tailwind · Leaflet via react-leaflet · leaflet.markercluster ·
leaflet.heat (toggle) · Nominatim geocoding · Supabase (Postgres + PostGIS) · Supabase Storage ·
Vercel + Supabase hosting · pluggable `<AdSlot>`.

---

## 2. Data model — see `supabase/schema.sql` (locations, reports, location_summary view,
reports_in_bounds RPC). weighted_score = recency-decayed bedbug count.

---

## 3. Credibility / anti-abuse model (the heart of the product)

- Confidence tiers from `weighted_score` (none / single / multiple / heavy). Colour + label
  from the tier, never raw count.
- Recency decay built into `weighted_score`; hide/fade markers >18 months old.
- Both `bedbugs` and `clean` reports — counter-evidence stops a permanent blacklist.
- Photo evidence optional but boosts displayed credibility (badge).
- Rate limiting via `reporter_hash` in RLS/RPC.
- Dispute path (Phase 2): notice-and-takedown.

---

## 4. Build phases

- **Phase 0 — Scaffold.** ✅ Vite+React+TS+Tailwind, Supabase schema + PostGIS, env wired.
- **Phase 1 — Map MVP (read-only).** ✅ Leaflet centred on Lithuania, `reports_in_bounds` per
  viewport, clustered markers coloured by tier, popups with the "unverified" label. Seed data.
- **Phase 2 — Reporting (write).** Nominatim address search (debounced ≥1s, cached) +
  click-to-drop-pin. Report form: status, optional note, optional photo. Photos boost weight
  ("evidenced" tier). **Strip EXIF on upload.** Add image-takedown route now. Find-or-create
  location (dedupe by osm_id/proximity), insert report, compute `reporter_hash`, enforce rate limit.
- **Phase 3 — Credibility layer.** Tiers → styling, recency fade, heatmap toggle (leaflet.heat),
  "Recent reports" side feed.
- **Phase 4 — Monetisation + polish.** `<AdSlot>` (one slot). Per-location crawlable URL (SEO).
  Mobile layout. Footer disclaimer + contact/takedown.
- **Phase 5 — Worldwide + hardening.** Drop Lithuania bounds. Self-hosted/paid geocoder.
  Moderation queue for disputes. Optional anonymous auth.

---

## 5. SEO — each location needs a server-renderable, indexable page (name + address +
summarised unverified history + disclaimer). This is the organic acquisition channel.

## 6. Ad / affiliate slot — ONE pluggable `<AdSlot>`. Start with a relevant affiliate banner
(encasements, sprays/heaters, pest-control referral), move to AdSense once there's traffic.

## 7. Explicit "do nots"

No Google Maps/Mapbox/paid tiles or geocoding in MVP · no raw IPs/PII · no "infested" verdict
from one report · no reports without decay · strip EXIF from photos · never ship without the
"unverified" labelling + takedown route · never more than one ad slot.
