/**
 * Free OpenStreetMap geocoding (Nominatim). Usage policy caps us at ~1 req/s and
 * forbids heavy use, so callers MUST debounce (>=1s) and we cache every query.
 * Browsers can't set a custom User-Agent; we rely on the Referer header. A
 * self-hosted/paid geocoder is the Phase 5 scale step.
 */
export interface GeoResult {
  label: string // human-readable address (Nominatim display_name)
  lat: number
  lng: number
  osmId: string | null // stable dedupe key, e.g. "n240109189"
}

const BASE = 'https://nominatim.openstreetmap.org'
const cache = new Map<string, GeoResult[]>()

interface RawPlace {
  display_name?: string
  lat?: string
  lon?: string
  osm_type?: string
  osm_id?: number
  error?: string
}

function toOsmId(p: RawPlace): string | null {
  if (!p.osm_type || p.osm_id == null) return null
  return `${p.osm_type[0]}${p.osm_id}` // type prefix (n/w/r) + id
}

export async function searchAddress(query: string, signal?: AbortSignal): Promise<GeoResult[]> {
  const q = query.trim()
  if (q.length < 3) return []
  const cached = cache.get(q)
  if (cached) return cached

  const url = `${BASE}/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`
  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'lt,en' } })
  if (!res.ok) throw new Error('Address search failed')

  const raw = (await res.json()) as RawPlace[]
  const out = raw
    .filter((p) => p.display_name && p.lat && p.lon)
    .map((p) => ({
      label: p.display_name as string,
      lat: Number(p.lat),
      lng: Number(p.lon),
      osmId: toOsmId(p),
    }))
  cache.set(q, out)
  return out
}

export async function reverseGeocode(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<GeoResult | null> {
  const url = `${BASE}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`
  const res = await fetch(url, { signal, headers: { 'Accept-Language': 'lt,en' } })
  if (!res.ok) return null

  const p = (await res.json()) as RawPlace
  if (!p || p.error || !p.display_name) return null
  return {
    label: p.display_name,
    lat: Number(p.lat ?? lat),
    lng: Number(p.lon ?? lng),
    osmId: toOsmId(p),
  }
}
