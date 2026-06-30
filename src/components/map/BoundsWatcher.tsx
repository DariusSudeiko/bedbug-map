import { useEffect } from 'react'
import { useMapEvents } from 'react-leaflet'
import type { LatLngBounds } from 'leaflet'

/**
 * Reports the current viewport bounds on mount and after every pan/zoom, so the
 * parent can fetch only what's visible.
 */
export function BoundsWatcher({ onChange }: { onChange: (b: LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => onChange(map.getBounds()),
    zoomend: () => onChange(map.getBounds()),
  })

  useEffect(() => {
    onChange(map.getBounds())
  }, [map, onChange])

  return null
}
