import { Link } from 'react-router-dom'

export function SiteHeader() {
  return (
    <header className="z-20 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-3">
      <Link to="/" className="flex items-baseline gap-2">
        <span className="text-lg font-semibold tracking-tight text-slate-900">🛏️ Bedbug Map</span>
        <span className="hidden text-sm text-slate-500 sm:inline">Lithuania</span>
      </Link>
      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200">
        All reports are user-submitted &amp; unverified
      </span>
    </header>
  )
}
