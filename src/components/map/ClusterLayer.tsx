import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.markercluster'
import type { LocationSummary } from '../../lib/types'
import { TIER_META, hasEvidence, markerOpacity, tierForSummary } from '../../lib/confidence'

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  )
}

function buildIcon(s: LocationSummary): L.DivIcon {
  const meta = TIER_META[tierForSummary(s)]
  const count = s.bedbug_reports > 0 ? s.bedbug_reports : s.clean_reports
  const badge = hasEvidence(s) ? '<span class="bb-pin-badge">📷</span>' : ''
  return L.divIcon({
    className: 'bb-pin-wrap',
    html: `<span class="bb-pin" style="--bb:${meta.color}">${count}${badge}</span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  })
}

/**
 * Renders summaries into a leaflet.markercluster group. react-leaflet v5 has no
 * built-in clustering, so we drive the cluster group imperatively via useMap.
 * Clicking a marker calls `onSelect` (the parent opens the detail panel).
 */
export function ClusterLayer({
  summaries,
  onSelect,
}: {
  summaries: LocationSummary[]
  onSelect: (s: LocationSummary) => void
}) {
  const map = useMap()
  const groupRef = useRef<L.MarkerClusterGroup | null>(null)
  // Keep the latest callback without re-running the data effect.
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  useEffect(() => {
    const group = L.markerClusterGroup({
      maxClusterRadius: 50,
      showCoverageOnHover: false,
    })
    groupRef.current = group
    map.addLayer(group)
    return () => {
      map.removeLayer(group)
      groupRef.current = null
    }
  }, [map])

  useEffect(() => {
    const group = groupRef.current
    if (!group) return
    group.clearLayers()
    for (const s of summaries) {
      const marker = L.marker([s.lat, s.lng], {
        icon: buildIcon(s),
        opacity: markerOpacity(s),
      })
      marker.bindTooltip(escapeHtml(s.address), { direction: 'top', offset: [0, -14] })
      marker.on('click', () => onSelectRef.current(s))
      group.addLayer(marker)
    }
  }, [summaries])

  return null
}
