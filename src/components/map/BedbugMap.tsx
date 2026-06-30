import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet'
import L, { type LatLngBounds } from 'leaflet'
import { reportsInBounds } from '../../lib/api'
import type { LocationSummary } from '../../lib/types'
import { BoundsWatcher } from './BoundsWatcher'
import { ClusterLayer } from './ClusterLayer'
import { HeatLayer } from './HeatLayer'

// Lithuania, per the brief.
const LT_CENTER: [number, number] = [55.17, 23.88]
const LT_ZOOM = 7

export type MapView = 'pins' | 'heat'

export interface LatLng {
  lat: number
  lng: number
}

interface Props {
  view: MapView
  onSelectLocation: (s: LocationSummary) => void
  onPickPoint: (p: LatLng) => void
  /** Move/zoom the map to here when this changes. */
  flyTo: LatLng | null
  /** Show a temporary "you are reporting here" pin. */
  tempPin: LatLng | null
  /** Bump to force a re-fetch of the current viewport (e.g. after a submit). */
  reloadSignal: number
}

function MapClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
  useMapEvents({
    click: (e) => onPick({ lat: e.latlng.lat, lng: e.latlng.lng }),
  })
  return null
}

function FlyTo({ target }: { target: LatLng }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 16))
  }, [map, target])
  return null
}

function TempPin({ pos }: { pos: LatLng }) {
  const map = useMap()
  useEffect(() => {
    const icon = L.divIcon({
      className: 'bb-temp-wrap',
      html: '<span class="bb-temp"></span>',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
    const marker = L.marker([pos.lat, pos.lng], { icon, zIndexOffset: 1000, interactive: false })
    marker.addTo(map)
    return () => {
      marker.remove()
    }
  }, [map, pos])
  return null
}

export function BedbugMap({
  view,
  onSelectLocation,
  onPickPoint,
  flyTo,
  tempPin,
  reloadSignal,
}: Props) {
  const [summaries, setSummaries] = useState<LocationSummary[]>([])
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const boundsRef = useRef<LatLngBounds | null>(null)

  const fetchBounds = useCallback((bounds: LatLngBounds) => {
    boundsRef.current = bounds
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      reportsInBounds(bounds)
        .then((rows) => {
          setSummaries(rows)
          setError(null)
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'Failed to load reports')
        })
    }, 300)
  }, [])

  // Re-fetch the current viewport whenever the parent bumps reloadSignal.
  useEffect(() => {
    if (reloadSignal > 0 && boundsRef.current) fetchBounds(boundsRef.current)
  }, [reloadSignal, fetchBounds])

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={LT_CENTER}
        zoom={LT_ZOOM}
        scrollWheelZoom
        zoomControl={false}
        className="h-full w-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        {/* Bottom-right keeps the +/- away from the top-left search bar on mobile. */}
        <ZoomControl position="bottomright" />
        {view === 'pins' ? (
          <ClusterLayer summaries={summaries} onSelect={onSelectLocation} />
        ) : (
          <HeatLayer summaries={summaries} />
        )}
        <BoundsWatcher onChange={fetchBounds} />
        <MapClickHandler onPick={onPickPoint} />
        {flyTo && <FlyTo target={flyTo} />}
        {tempPin && <TempPin pos={tempPin} />}
      </MapContainer>

      {error && (
        <div className="absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-md bg-red-600 px-3 py-1.5 text-sm text-white shadow-lg">
          {error}
        </div>
      )}
    </div>
  )
}
