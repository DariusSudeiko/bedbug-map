import { useEffect, useRef } from 'react'
import { useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import type { LocationSummary } from '../../lib/types'

// weighted_score at which a point reaches full (red) intensity.
const FULL_HEAT = 4
// Baseline so a single recent report is clearly visible (tentative yellow) rather
// than near-transparent; heavier scores climb from there toward deep red.
const BASELINE = 0.25

// Warm gradient — bedbug hotspots, no "cold" blue. Tentative (yellow) → serious (red).
const GRADIENT = { 0.2: '#fde047', 0.5: '#fb923c', 0.75: '#ef4444', 1: '#b91c1c' }

/**
 * "Hotspot" view: a leaflet.heat layer weighted by each location's
 * recency-decayed bedbug score. Clean-only locations (score 0) don't contribute,
 * so the heatmap shows where recent bedbug reports cluster — not a verdict.
 */
export function HeatLayer({ summaries }: { summaries: LocationSummary[] }) {
  const map = useMap()
  const layerRef = useRef<ReturnType<typeof L.heatLayer> | null>(null)

  useEffect(() => {
    const points = summaries
      .filter((s) => s.weighted_score > 0)
      .map(
        (s) =>
          [s.lat, s.lng, Math.min(1, BASELINE + s.weighted_score / FULL_HEAT)] as [
            number,
            number,
            number,
          ],
      )

    const layer = L.heatLayer(points, {
      radius: 32,
      blur: 22,
      maxZoom: 17,
      max: 1,
      minOpacity: 0.45,
      gradient: GRADIENT,
    })
    layer.addTo(map)
    layerRef.current = layer

    return () => {
      map.removeLayer(layer)
      layerRef.current = null
    }
  }, [map, summaries])

  return null
}
