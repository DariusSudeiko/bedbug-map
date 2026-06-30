import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { GeoResult } from '../lib/nominatim'
import type { LocationSummary, ReportDetail } from '../lib/types'
import { TIER_META, hasEvidence, isStale, tierForSummary } from '../lib/confidence'
import { flagReport, reportsForLocation } from '../lib/api'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function FlagControl({ reportId }: { reportId: string }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [contact, setContact] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (done) return <span className="text-[11px] text-slate-400">Flagged for review.</span>

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] text-slate-300 hover:text-slate-500"
      >
        Flag
      </button>
    )
  }

  async function submit() {
    if (!reason.trim()) {
      setError('A reason is required.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await flagReport(reportId, reason, contact)
      setDone(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not submit flag.')
      setBusy(false)
    }
  }

  return (
    <div className="mt-2 space-y-1 rounded border border-slate-200 p-2">
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        rows={2}
        placeholder="Why should this be reviewed? (required)"
        className="w-full resize-none rounded border border-slate-300 px-2 py-1 text-xs"
      />
      <input
        value={contact}
        onChange={(e) => setContact(e.target.value)}
        placeholder="Contact email (optional)"
        className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
      />
      {error && <p className="text-[11px] text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded bg-slate-800 px-2 py-1 text-[11px] text-white disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Submit flag'}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-2 py-1 text-[11px] text-slate-500"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

interface Props {
  summary: LocationSummary
  onClose: () => void
  onReportHere: (target: GeoResult) => void
}

export function LocationDetail({ summary, onClose, onReportHere }: Props) {
  const [reports, setReports] = useState<ReportDetail[]>([])
  const [loading, setLoading] = useState(true)
  const meta = TIER_META[tierForSummary(summary)]

  useEffect(() => {
    let active = true
    setLoading(true)
    reportsForLocation(summary.id)
      .then((r) => active && setReports(r))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [summary.id])

  return (
    <div className="absolute right-3 top-3 bottom-3 z-[1100] flex w-[min(92vw,22rem)] flex-col rounded-lg border border-slate-200 bg-white shadow-lg">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide" style={{ color: meta.color }}>
            {meta.label}
            {hasEvidence(summary) && <span className="ml-1">📷</span>}
          </div>
          <div className="text-sm font-medium text-slate-900">{summary.address}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-4 border-b border-slate-100 px-4 py-2 text-xs text-slate-600">
        <span>🐛 <strong>{summary.bedbug_reports}</strong> bedbug</span>
        <span>✅ <strong>{summary.clean_reports}</strong> clean</span>
        {summary.last_report_at && <span className="ml-auto">Last: {fmtDate(summary.last_report_at)}</span>}
      </div>

      {isStale(summary) && (
        <div className="bg-amber-50 px-4 py-2 text-[11px] text-amber-800">
          Newest report is over 18 months old — shown faded.
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {loading ? (
          <p className="text-sm text-slate-400">Loading reports…</p>
        ) : reports.length === 0 ? (
          <p className="text-sm text-slate-400">No report details available.</p>
        ) : (
          <ul className="space-y-3">
            {reports.map((r) => (
              <li key={r.id} className="rounded-md border border-slate-100 p-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className={r.status === 'bedbugs' ? 'text-red-600' : 'text-green-600'}>
                    {r.status === 'bedbugs' ? '🐛 Bedbugs' : '✅ No bedbugs'}
                  </span>
                  <span className="text-slate-400">{fmtDate(r.created_at)}</span>
                  {r.unit && <span className="text-slate-500">· {r.unit}</span>}
                </div>
                {r.note && <p className="mt-1 text-sm text-slate-700">{r.note}</p>}
                {r.photo_url && (
                  <a href={r.photo_url} target="_blank" rel="noreferrer">
                    <img
                      src={r.photo_url}
                      alt="report evidence"
                      className="mt-2 max-h-40 w-full rounded object-cover"
                    />
                  </a>
                )}
                <div className="mt-1 flex justify-end">
                  <FlagControl reportId={r.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-slate-200 px-4 py-3">
        <button
          type="button"
          onClick={() =>
            onReportHere({
              label: summary.address,
              lat: summary.lat,
              lng: summary.lng,
              osmId: summary.osm_id,
            })
          }
          className="w-full rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Report this address
        </button>
        <div className="mt-2 flex items-center justify-between text-[11px]">
          <span className="text-slate-400">User-submitted, unverified reports.</span>
          <Link to={`/place/${summary.id}`} className="text-slate-500 underline hover:text-slate-700">
            Open page ↗
          </Link>
        </div>
      </div>
    </div>
  )
}
