import type { LocationSummary } from './types'

/**
 * Confidence tiers. Colour + label are derived from these, never from a raw
 * report count — a location must never be branded "infested" off one report.
 */
export type Tier = 'heavy' | 'multiple' | 'single' | 'clean' | 'none'

/** ~18 months, matching the recency-decay window baked into the SQL view. */
export const STALE_DAYS = 540

export function daysSince(iso: string | null): number {
  if (!iso) return Infinity
  return (Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24)
}

/** A location whose newest report is older than the decay window. */
export function isStale(s: LocationSummary): boolean {
  return daysSince(s.last_report_at) > STALE_DAYS
}

export function tierForSummary(s: LocationSummary): Tier {
  const score = s.weighted_score ?? 0
  if (score <= 0) {
    return s.clean_reports > 0 ? 'clean' : 'none'
  }
  if (score >= 4) return 'heavy'
  if (score >= 1.5) return 'multiple'
  return 'single'
}

export const TIER_META: Record<Tier, { color: string; label: string }> = {
  heavy: { color: '#b91c1c', label: 'Many recent reports' },
  multiple: { color: '#ea580c', label: 'Several recent reports' },
  single: { color: '#d97706', label: 'Single unverified report' },
  clean: { color: '#16a34a', label: 'Reported clean' },
  none: { color: '#9ca3af', label: 'No current reports' },
}

/** Recency fade: stale locations are de-emphasised on the map (not a verdict). */
export function markerOpacity(s: LocationSummary): number {
  return isStale(s) ? 0.4 : 1
}

/** At least one bedbug report carries a photo — shown with an evidence badge. */
export function hasEvidence(s: LocationSummary): boolean {
  return (s.evidenced_reports ?? 0) > 0
}
