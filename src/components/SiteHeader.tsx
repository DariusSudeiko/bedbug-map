import { Link } from 'react-router-dom'

export function SiteHeader() {
  return (
    <header className="z-20 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-200 bg-white px-3 py-1.5 sm:px-4 sm:py-3">
      <Link to="/" className="flex items-baseline gap-2">
        <span className="text-base font-semibold tracking-tight text-slate-900 sm:text-lg">
          🛏️ Bedbug Map
        </span>
        <span className="hidden text-sm text-slate-500 sm:inline">Lithuania</span>
      </Link>
      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200 sm:px-3 sm:py-1 sm:text-xs">
        User-submitted &amp; unverified
      </span>
    </header>
  )
}
