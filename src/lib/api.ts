import type { LatLngBounds } from 'leaflet'
import { supabase, supabaseConfigured } from './supabase'
import { getSessionId } from './session'
import type { LocationSummary, RecentReport, ReportDetail, ReportStatus } from './types'

/**
 * Fetch per-location summaries whose point falls inside the current map
 * viewport. Returns [] when Supabase isn't configured so the app still runs.
 */
export async function reportsInBounds(bounds: LatLngBounds): Promise<LocationSummary[]> {
  if (!supabaseConfigured || !supabase) return []

  const sw = bounds.getSouthWest()
  const ne = bounds.getNorthEast()

  const { data, error } = await supabase.rpc('reports_in_bounds', {
    min_lat: sw.lat,
    min_lng: sw.lng,
    max_lat: ne.lat,
    max_lng: ne.lng,
  })

  if (error) throw new Error(error.message)
  return (data ?? []) as LocationSummary[]
}

/** Recent reports for one address (drives the detail panel). */
export async function reportsForLocation(locationId: string): Promise<ReportDetail[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('reports_for_location', {
    p_location_id: locationId,
  })
  if (error) throw new Error(error.message)
  return (data ?? []) as ReportDetail[]
}

/** Latest reports nationwide (drives the "Recent reports" feed). */
export async function recentReports(limit = 20): Promise<RecentReport[]> {
  if (!supabase) return []
  const { data, error } = await supabase.rpc('recent_reports', { p_limit: limit })
  if (error) throw new Error(error.message)
  return (data ?? []) as RecentReport[]
}

/** Fetch a single location summary by id (to open a feed item's detail panel). */
export async function locationSummaryById(id: string): Promise<LocationSummary | null> {
  if (!supabase) return null
  const { data, error } = await supabase.rpc('location_summary_by_id', { p_id: id })
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as LocationSummary[]
  return rows[0] ?? null
}

export interface ReportInput {
  address: string
  lat: number
  lng: number
  osmId: string | null
  status: ReportStatus
  note?: string
  unit?: string
  photoUrl?: string | null
}

/** Submit a report. Returns the location id. Throws a human-readable message on failure. */
export async function submitReport(input: ReportInput): Promise<string> {
  if (!supabase) throw new Error('Connect Supabase to submit reports.')
  const { data, error } = await supabase.rpc('submit_report', {
    p_address: input.address,
    p_lat: input.lat,
    p_lng: input.lng,
    p_osm_id: input.osmId,
    p_status: input.status,
    p_note: input.note ?? null,
    p_unit: input.unit ?? null,
    p_photo_url: input.photoUrl ?? null,
    p_session: getSessionId(),
  })
  if (error) throw new Error(error.message)
  return data as string
}

/** Upload an already-EXIF-stripped JPEG blob; returns its public URL. */
export async function uploadReportPhoto(blob: Blob): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured')
  const name = `${crypto.randomUUID()}.jpg`
  const { error } = await supabase.storage.from('report-photos').upload(name, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw new Error(error.message)
  return supabase.storage.from('report-photos').getPublicUrl(name).data.publicUrl
}

/** Best-effort removal of a just-uploaded photo (used if the report insert then fails). */
export async function removeReportPhoto(publicUrl: string): Promise<void> {
  if (!supabase) return
  const name = publicUrl.split('/').pop()
  if (!name) return
  await supabase.storage.from('report-photos').remove([name])
}

/** Flag a report/photo for moderation (low-key takedown route). */
export async function flagReport(reportId: string, reason: string, contact: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured')
  const { error } = await supabase.rpc('flag_report', {
    p_report_id: reportId,
    p_reason: reason,
    p_contact: contact,
  })
  if (error) throw new Error(error.message)
}
