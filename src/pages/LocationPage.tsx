import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SiteHeader } from '../components/SiteHeader'
import { SiteFooter } from '../components/SiteFooter'
import { AdSlot } from '../components/AdSlot'
import { locationSummaryById, reportsForLocation } from '../lib/api'
import { TIER_META, hasEvidence, isStale, tierForSummary } from '../lib/confidence'
import { useDocumentMeta } from '../lib/meta'
import type { LocationSummary, ReportDetail } from '../lib/types'

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function LocationPage() {
  const { id = '' } = useParams()
  const [summary, setSummary] = useState<LocationSummary | null>(null)
  const [reports, setReports] = useState<ReportDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    Promise.all([locationSummaryById(id), reportsForLocation(id)])
      .then(([s, r]) => {
        if (!active) return
        if (!s) setNotFound(true)
        else {
          setSummary(s)
          setReports(r)
        }
      })
      .catch(() => active && setNotFound(true))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [id])

  const meta = TIER_META[summary ? tierForSummary(summary) : 'none']

  const title = summary ? `Bedbug reports: ${summary.address}` : 'Bedbug Map'
  const description = summary
    ? `${summary.bedbug_reports} bedbug and ${summary.clean_reports} clean user reports for ${summary.address}. User-submitted and unverified.`
    : 'Crowdsourced, unverified bedbug reports.'
  const jsonLd = useMemo(
    () =>
      summary
        ? {
            '@context': 'https://schema.org',
            '@type': 'Place',
            name: summary.address,
            address: summary.address,
            geo: {
              '@type': 'GeoCoordinates',
              latitude: summary.lat,
              longitude: summary.lng,
            },
            description,
          }
        : undefined,
    [summary, description],
  )

  useDocumentMeta({
    title,
    description,
    canonical: typeof window !== 'undefined' ? window.location.href : undefined,
    jsonLd,
  })

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-800">
      <SiteHeader />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700">
          ← Back to map
        </Link>

        {loading ? (
          <p className="mt-6 text-slate-400">Loading…</p>
        ) : notFound || !summary ? (
          <div className="mt-6">
            <h1 className="text-xl font-semibold text-slate-900">Address not found</h1>
            <p className="mt-2 text-slate-600">This report page doesn’t exist or has been removed.</p>
          </div>
        ) : (
          <>
            <div
              className="mt-4 text-xs font-semibold uppercase tracking-wide"
              style={{ color: meta.color }}
            >
              {meta.label}
              {hasEvidence(summary) && <span className="ml-1">📷</span>}
            </div>
            <h1 className="mt-1 text-2xl font-semibold text-slate-900">{summary.address}</h1>
            <p className="mt-1 text-sm text-amber-700">
              User-submitted, unverified reports — not a verdict on this property.
            </p>

            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
              <span>
                🐛 <strong>{summary.bedbug_reports}</strong> bedbug
              </span>
              <span>
                ✅ <strong>{summary.clean_reports}</strong> clean
              </span>
              {summary.last_report_at && <span>Last reported {fmtDate(summary.last_report_at)}</span>}
              <Link
                to={`/?place=${summary.id}`}
                className="ml-auto rounded-md bg-slate-900 px-3 py-1.5 text-white hover:bg-slate-700"
              >
                View on map
              </Link>
            </div>

            {isStale(summary) && (
              <p className="mt-3 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">
                The newest report here is over 18 months old, so it’s de-emphasised. Bedbugs get
                treated — a stale report doesn’t mean a current problem.
              </p>
            )}

            <div className="my-6">
              <AdSlot />
            </div>

            <h2 className="text-lg font-semibold text-slate-900">Report history</h2>
            {reports.length === 0 ? (
              <p className="mt-2 text-slate-400">No report details available.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {reports.map((r) => (
                  <li key={r.id} className="rounded-md border border-slate-200 p-3">
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
                          className="mt-2 max-h-56 rounded object-cover"
                        />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
