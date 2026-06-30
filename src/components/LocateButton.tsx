import { useState } from 'react'
import type { LatLng } from './map/BedbugMap'

/** Floating "use my location" button (handy on phones). Needs HTTPS, which the deploy has. */
export function LocateButton({
  onLocate,
  onError,
}: {
  onLocate: (p: LatLng) => void
  onError: (msg: string) => void
}) {
  const [busy, setBusy] = useState(false)

  function locate() {
    if (!('geolocation' in navigator)) {
      onError('Location isn’t available on this device.')
      return
    }
    setBusy(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false)
        onLocate({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      () => {
        setBusy(false)
        onError('Couldn’t get your location — check the permission.')
      },
      { enableHighAccuracy: true, timeout: 8000 },
    )
  }

  return (
    <button
      type="button"
      onClick={locate}
      disabled={busy}
      aria-label="Use my location"
      className="absolute bottom-24 right-3 z-[1000] flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-lg shadow-md hover:bg-slate-50 disabled:opacity-60"
    >
      {busy ? '…' : '📍'}
    </button>
  )
}
