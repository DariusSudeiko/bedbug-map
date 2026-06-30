export type ReportStatus = 'bedbugs' | 'clean'

/** One row returned by the `reports_in_bounds` RPC (a `location_summary` row). */
export interface LocationSummary {
  id: string
  name: string | null
  address: string
  lat: number
  lng: number
  osm_id: string | null
  bedbug_reports: number
  clean_reports: number
  /** ISO timestamp of the most recent report, or null if none. */
  last_report_at: string | null
  /** Recency-decayed bedbug score (photo-backed reports weigh more). */
  weighted_score: number
  /** How many bedbug reports carry a photo. */
  evidenced_reports: number
}

/** A single report shown in the location detail panel (no reporter_hash). */
export interface ReportDetail {
  id: string
  status: ReportStatus
  note: string | null
  unit: string | null
  photo_url: string | null
  created_at: string
}

/** One row from the nationwide `recent_reports` feed. */
export interface RecentReport {
  report_id: string
  location_id: string
  address: string
  lat: number
  lng: number
  status: ReportStatus
  note: string | null
  photo_url: string | null
  created_at: string
}
