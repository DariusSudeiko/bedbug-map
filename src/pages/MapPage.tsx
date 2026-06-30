import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BedbugMap, type LatLng, type MapView } from '../components/map/BedbugMap'
import { Legend } from '../components/Legend'
import { SearchBox } from '../components/SearchBox'
import { ReportForm } from '../components/ReportForm'
import { LocationDetail } from '../components/LocationDetail'
import { ViewToggle } from '../components/ViewToggle'
import { RecentFeed } from '../components/RecentFeed'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { reverseGeocode, type GeoResult } from '../lib/nominatim'
import { locationSummaryById, recentReports } from '../lib/api'
import { supabaseConfigured } from '../lib/supabase'
import type { LocationSummary, RecentReport } from '../lib/types'

export function MapPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [target, setTarget] = useState<GeoResult | null>(null) // address being reported
  const [detail, setDetail] = useState<LocationSummary | null>(null) // marker clicked
  const [flyTo, setFlyTo] = useState<LatLng | null>(null)
  const [tempPin, setTempPin] = useState<LatLng | null>(null)
  const [reloadSignal, setReloadSignal] = useState(0)
  const [toast, setToast] = useState<string | null>(null)
  const [picking, setPicking] = useState(false)
  const [view, setView] = useState<MapView>('pins')
  const [recent, setRecent] = useState<RecentReport[]>([])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  // Load the nationwide recent feed on mount and after each submit.
  useEffect(() => {
    let active = true
    recentReports(20)
      .then((r) => active && setRecent(r))
      .catch(() => {})
    return () => {
      active = false
    }
  }, [reloadSignal])

  // ?place=<id> deep-link (from a shared location page's "View on map" button).
  const placeParam = searchParams.get('place')
  useEffect(() => {
    if (!placeParam) return
    locationSummaryById(placeParam)
      .then((s) => {
        if (s) {
          setDetail(s)
          setFlyTo({ lat: s.lat, lng: s.lng })
        }
      })
      .catch(() => {})
    searchParams.delete('place')
    setSearchParams(searchParams, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeParam])

  const openReport = useCallback((r: GeoResult) => {
    setDetail(null)
    setTarget(r)
    setTempPin({ lat: r.lat, lng: r.lng })
    setFlyTo({ lat: r.lat, lng: r.lng })
  }, [])

  const onPickPoint = useCallback(
    (p: LatLng) => {
      if (target) return // a report is already open — ignore stray map clicks
      setDetail(null)
      setTempPin(p)
      setPicking(true)
      reverseGeocode(p.lat, p.lng)
        .then((r) => setTarget(r ?? { label: '', lat: p.lat, lng: p.lng, osmId: null }))
        .finally(() => setPicking(false))
    },
    [target],
  )

  const onSelectLocation = useCallback((s: LocationSummary) => {
    setTarget(null)
    setTempPin(null)
    setDetail(s)
    setFlyTo({ lat: s.lat, lng: s.lng })
  }, [])

  const onSelectRecent = useCallback((r: RecentReport) => {
    setTarget(null)
    setTempPin(null)
    setFlyTo({ lat: r.lat, lng: r.lng })
    locationSummaryById(r.location_id)
      .then((s) => s && setDetail(s))
      .catch(() => {})
  }, [])

  function closeReport() {
    setTarget(null)
    setTempPin(null)
  }

  function onSubmitted() {
    closeReport()
    setReloadSignal((n) => n + 1)
    setToast('Thanks — your report is on the map.')
  }

  return (
    <div className="flex h-screen flex-col bg-white text-slate-800">
      <SiteHeader />

      {!supabaseConfigured && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          Supabase isn’t configured yet — the map is live but empty. Add{' '}
          <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_URL</code> and{' '}
          <code className="rounded bg-amber-100 px-1">VITE_SUPABASE_ANON_KEY</code> to{' '}
          <code className="rounded bg-amber-100 px-1">.env.local</code>.
        </div>
      )}

      <main className="relative flex-1">
        <BedbugMap
          view={view}
          onSelectLocation={onSelectLocation}
          onPickPoint={onPickPoint}
          flyTo={flyTo}
          tempPin={tempPin}
          reloadSignal={reloadSignal}
        />
        <SearchBox onSelect={openReport} />
        <ViewToggle view={view} onChange={setView} />
        <RecentFeed reports={recent} onSelect={onSelectRecent} />
        <Legend />

        {detail && (
          <LocationDetail summary={detail} onClose={() => setDetail(null)} onReportHere={openReport} />
        )}
        {target && <ReportForm target={target} onClose={closeReport} onSubmitted={onSubmitted} />}

        {picking && (
          <div className="absolute left-1/2 top-32 z-[1100] -translate-x-1/2 rounded-md bg-slate-900/90 px-3 py-1.5 text-sm text-white shadow">
            Finding address…
          </div>
        )}
        {toast && (
          <div className="absolute bottom-6 left-1/2 z-[1200] -translate-x-1/2 rounded-md bg-green-600 px-4 py-2 text-sm text-white shadow-lg">
            {toast}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
