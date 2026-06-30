import { useState } from 'react'
import type { RecentReport } from '../lib/types'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function RecentFeed({
  reports,
  onSelect,
}: {
  reports: RecentReport[]
  onSelect: (r: RecentReport) => void
}) {
  // Collapsed by default on small screens to keep the map uncluttered.
  const [open, setOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 640,
  )
  if (reports.length === 0) return null

  return (
    <div className="absolute left-3 top-28 z-[1100] w-[min(86vw,18rem)] rounded-lg border border-slate-200 bg-white/95 shadow-md backdrop-blur">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold text-slate-700"
      >
        <span>🕒 Recent reports</span>
        <span className="text-slate-400">{open ? '▾' : '▸'}</span>
      </button>
      {open && (
        <ul className="max-h-[45vh] overflow-y-auto border-t border-slate-100 text-sm">
          {reports.map((r) => (
            <li key={r.report_id}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                className="block w-full px-3 py-2 text-left hover:bg-slate-50"
              >
                <div className="flex items-center gap-2 text-xs">
                  <span className={r.status === 'bedbugs' ? 'text-red-600' : 'text-green-600'}>
                    {r.status === 'bedbugs' ? '🐛 Bedbugs' : '✅ Clean'}
                  </span>
                  <span className="text-slate-400">{fmtDate(r.created_at)}</span>
                </div>
                <div className="truncate text-slate-700">{r.address}</div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
