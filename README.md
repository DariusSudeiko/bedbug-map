# Bedbug Map

A crowdsourced map of **user-submitted, unverified** bedbug / clean reports for hotels,
rentals and apartments. Lithuania first; the data layer is global from day one.

Stack: Vite + React + TypeScript + Tailwind v4, Leaflet (free OSM tiles) with
`leaflet.markercluster`, Supabase (Postgres + PostGIS) backend.

> **Status: Phase 0–5 (MVP).** Map, reporting, credibility layer (heatmap + recent feed),
> per-address SEO pages + one pluggable affiliate `<AdSlot>`, and now an installable **PWA** ready
> to deploy (Vercel + Supabase). Address-centric; stays Lithuania-centred but users can zoom/pan
> anywhere. See [`bedbug-map-plan.md`](bedbug-map-plan.md).

---

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
```

The app boots **without** Supabase — you'll see the Lithuania map and an amber "Supabase
isn't configured" banner. Markers appear once you complete the backend setup below.

## Backend setup (one-time, ~5 min)

1. Create a free project at <https://supabase.com> (any region near Lithuania, e.g. EU).
2. **Schema (Phase 1):** Dashboard → **SQL Editor** → New query → paste all of
   [`supabase/schema.sql`](supabase/schema.sql) → **Run**. Enables PostGIS, creates the tables,
   the `location_summary` view, and the `reports_in_bounds` RPC.
3. **Reporting, storage & feed (Phase 2 + 3):** run
   [`supabase/phase2.sql`](supabase/phase2.sql), then in a new query run
   [`supabase/phase3.sql`](supabase/phase3.sql). Phase 2 adds the write RPCs (`submit_report` /
   `reports_for_location` / `flag_report`), salted-hash rate limiting, and the `report-photos`
   bucket. Phase 3 adds `recent_reports` + `location_summary_by_id` for the recent feed. (Both run
   *after* `schema.sql`.)
4. **Seed (optional dev data):** new query → paste [`supabase/seed.sql`](supabase/seed.sql) →
   **Run**. Adds ~10 fake Lithuanian locations covering every confidence tier (and gives the
   heatmap something to show). Skip this if you'd rather start with real reports.
5. **Keys:** Dashboard → **Project Settings → API**. Copy the **Project URL** and the
   **anon / public** key.
6. Put them in `.env.local` (already created, gitignored):
   ```
   VITE_SUPABASE_URL=https://your-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
7. Restart `npm run dev`. Search an address (or click the map) → fill the form → submit; your
   report appears for the next visitor. Click a marker for its report history.

## What to look for (Phase 1 acceptance)

- Map centred on Lithuania, zoom 7; free OSM tiles, no API key.
- Markers load **per viewport** (every pan/zoom calls `reports_in_bounds`, debounced).
- Marker colour = **confidence tier** (recency-weighted), never a raw count:
  red = many recent, orange = several, amber = single, green = reported clean, grey = none.
- Stale locations (newest report > 18 months) are **faded** — e.g. the Panevėžys pin.
- Every detail panel and the header carry the **"user-reported · unverified"** label.
- Footer has a low-key **"Legal"** contact link (deliberately not a prominent "dispute" button).

## What to look for (Phase 2 acceptance)

- **Address search** (top): type ≥3 chars → debounced (1s) Nominatim results → pick one.
- **Drop a pin**: click anywhere on the map → it reverse-geocodes to an address.
- Either way the **report form** opens prefilled: status (bedbugs / clean), optional unit/floor,
  optional note, optional photo. **Photo GPS/EXIF is stripped client-side before upload.**
- Submit → the report is saved and appears on the map for the next visitor; photo-backed bedbug
  reports weigh more ("evidenced", shown with a 📷 badge).
- **Rate limits**: one report per address per device per 24h, max 5 per device per hour
  (enforced server-side via a salted hash of IP + session — no raw IP stored).
- Click a marker → **detail panel** with the address's report history; each report has a
  low-key **Flag** link (queued for moderation, never auto-removed).

## What to look for (Phase 3 acceptance)

- **Pins / Heatmap toggle** (top-left): Heatmap renders a hotspot layer weighted by each
  location's recency-decayed bedbug score (clean-only spots don't glow). Switch back to Pins to
  click markers.
- **Recent reports feed** (left): the latest reports nationwide; click one to fly there and open
  its detail. Refreshes after you submit.
- The credibility model reads at a glance: one report looks tentative (amber), several recent
  ones look serious (orange/red), photo-backed ones rank higher (📷), old ones fade.

## What to look for (Phase 4 acceptance)

- **Per-address page** at `/place/:id` (e.g. via a marker's "Open page ↗" link): its own
  shareable URL with a real `<h1>` (the address), an SEO `<title>` ("Bedbug reports: …"), meta
  description, and JSON-LD `Place` structured data — plus the report history and disclaimer.
- **One `<AdSlot>`** renders on that page (affiliate banner, `rel="sponsored nofollow"`); the map
  stays ad-free to protect credibility.
- The page links back into the live map (`/?place=:id` flies to and opens that location).
- Layout is usable on mobile (overlays stack; recent feed collapses).

> **SEO note:** the pages are client-rendered with dynamic meta + JSON-LD, which Google indexes
> (it executes JS). For *all* crawlers / link unfurlers, add server-side rendering or prerendering
> at deploy time — see "known follow-ups". [`vercel.json`](vercel.json) already routes deep links
> to the SPA.

## Deploy (Vercel + Supabase)

Supabase (backend) is already live. To put the frontend online:

1. Push this folder to a GitHub repo.
2. <https://vercel.com> → **Add New → Project** → import the repo. Vercel auto-detects Vite
   (build `npm run build`, output `dist`).
3. **Environment Variables** → add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values
   as `.env.local`). The anon/publishable key is safe to expose; RLS + the security-definer RPCs
   protect the data.
4. **Deploy.** You get a public `https://…vercel.app` URL. [`vercel.json`](vercel.json) makes deep
   links like `/place/:id` resolve to the SPA. No CORS setup needed — Supabase's data API allows
   any origin.

## Install on Android (PWA)

The app is a Progressive Web App, so it installs to the home screen and runs full-screen — no
Play Store needed. Requires HTTPS, which the Vercel URL provides.

1. On your Android phone, open the deployed URL in **Chrome**.
2. Use it straight away (search, drop a pin, report, browse the map).
3. To install: Chrome **⋮ menu → Add to Home screen** (or tap the "Install app" prompt). It lands
   on your home screen with the Bedbug Map icon and opens chrome-less like a native app.
4. When you reload, it auto-updates to the latest deploy; OSM tiles you've viewed are cached for
   quicker / brief-offline revisits.

Run `node scripts/gen-icons.mjs` to regenerate the PNG icons if you edit `public/icon.svg`.

## Project layout

```
src/
  lib/
    supabase.ts      Supabase client (null-safe when env is unset)
    session.ts       anonymous per-browser id (for rate limiting)
    types.ts         LocationSummary / ReportDetail types
    confidence.ts    tiers, colours, recency fade  <- the credibility model
    nominatim.ts     free OSM geocoding (search + reverse), cached
    exif.ts          canvas re-encode that strips photo GPS/EXIF
    meta.ts          per-page <title>/meta/JSON-LD for SEO
    api.ts           reports_in_bounds / submit_report / reports_for_location / recent / flag / upload
  pages/
    MapPage.tsx       the interactive map view ( / )
    LocationPage.tsx  per-address SEO page ( /place/:id )
  components/
    map/
      BedbugMap.tsx     map + tiles + viewport fetch + click/fly-to/temp-pin + view switch
      BoundsWatcher.tsx pan/zoom -> bounds
      ClusterLayer.tsx  markercluster group (imperative; RL5 has no built-in)
      HeatLayer.tsx     leaflet.heat hotspot layer (weighted by score)
    SearchBox.tsx       debounced address search
    ReportForm.tsx      report modal (status, unit, note, EXIF-stripped photo)
    LocationDetail.tsx  per-address report history + flag route
    ViewToggle.tsx      Pins / Heatmap switch
    RecentFeed.tsx      nationwide latest-reports feed
    AdSlot.tsx          the single pluggable ad/affiliate slot
    SiteHeader.tsx      shared header (always-visible "unverified" badge)
    SiteFooter.tsx      shared footer (disclaimer + low-key "Legal" link)
    Legend.tsx
  App.tsx            routes: / -> MapPage, /place/:id -> LocationPage
supabase/
  schema.sql         Phase 1: tables, view, RPC, RLS              (run first)
  phase2.sql         Phase 2: write RPCs, rate limit, storage     (run after schema)
  phase3.sql         Phase 3: recent_reports + summary-by-id RPCs (run after phase2)
  seed.sql           optional fake dev data                       (run after schema)
vercel.json          SPA deep-link rewrites for deployment
```

## Notes / known follow-ups

- **`TAKEDOWN_EMAIL`** in `src/components/SiteFooter.tsx` is a placeholder
  (`takedown@example.com`) — set a real monitored address before any public launch.
- **`AFFILIATE`** in `src/components/AdSlot.tsx` points at a placeholder URL — swap in a real
  affiliate/referral link. The whole slot is one component, so changing provider (or moving to
  AdSense once there's traffic) is a one-file edit.
- **SEO hardening (deploy time):** pages are client-rendered today. For maximal crawlability, add
  SSR/prerendering on Vercel (e.g. an edge function that injects per-place `<title>`/meta/JSON-LD
  into `index.html`, or a prerender step). The data RPCs already exist to power it.
- Public Nominatim (geocoding) caps at ~1 req/s and forbids heavy use (we debounce + cache).
  Self-hosting or a paid geocoder is the Phase 5 scale step.
- **Photo uploads are anonymous and unauthenticated** (bucket capped at 5 MB, images only).
  Fine for MVP; abuse-hardening (e.g. a pre-upload rate check, virus/again-content scanning) is a
  later step.
- Do not run `seed.sql` against a real/production database — it `truncate`s the tables.
