import { useEffect, useRef, useState } from 'react'
import { searchAddress, type GeoResult } from '../lib/nominatim'

const DEBOUNCE_MS = 1000 // Nominatim policy: <=1 req/s

export function SearchBox({ onSelect }: { onSelect: (r: GeoResult) => void }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GeoResult[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const abortRef = useRef<AbortController | null>(null)
  // Drop the long hint on narrow screens where it gets clipped.
  const placeholder =
    typeof window !== 'undefined' && window.innerWidth < 640
      ? 'Search an address…'
      : 'Search an address…  (or click the map to drop a pin)'

  useEffect(() => {
    clearTimeout(timerRef.current)
    abortRef.current?.abort()
    const q = query.trim()
    if (q.length < 3) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    timerRef.current = setTimeout(() => {
      const ctrl = new AbortController()
      abortRef.current = ctrl
      searchAddress(q, ctrl.signal)
        .then((r) => {
          setResults(r)
          setOpen(true)
          setError(null)
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === 'AbortError') return
          setError('Search failed — try again')
        })
        .finally(() => setLoading(false))
    }, DEBOUNCE_MS)
    return () => clearTimeout(timerRef.current)
  }, [query])

  function choose(r: GeoResult) {
    setQuery(r.label)
    setResults([])
    setOpen(false)
    onSelect(r)
  }

  return (
    <div className="absolute left-1/2 top-3 z-[1100] w-[min(92vw,30rem)] -translate-x-1/2">
      <div className="rounded-lg border border-slate-200 bg-white shadow-md">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="text-slate-400">🔎</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => results.length && setOpen(true)}
            placeholder={placeholder}
            className="w-full bg-transparent text-sm text-slate-800 outline-none placeholder:text-slate-400"
            aria-label="Search an address"
          />
          {loading && <span className="text-xs text-slate-400">…</span>}
        </div>

        {open && (results.length > 0 || error) && (
          <ul className="max-h-64 overflow-auto border-t border-slate-100 text-sm">
            {error && <li className="px-3 py-2 text-red-600">{error}</li>}
            {results.map((r) => (
              <li key={`${r.osmId}-${r.lat}-${r.lng}`}>
                <button
                  type="button"
                  onClick={() => choose(r)}
                  className="block w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50"
                >
                  {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
