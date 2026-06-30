import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import type { GeoResult } from '../lib/nominatim'
import type { ReportStatus } from '../lib/types'
import { stripExifToJpeg } from '../lib/exif'
import { removeReportPhoto, submitReport, uploadReportPhoto } from '../lib/api'

interface Props {
  target: GeoResult
  onClose: () => void
  onSubmitted: (locationId: string) => void
}

export function ReportForm({ target, onClose, onSubmitted }: Props) {
  const [address, setAddress] = useState(target.label)
  const [status, setStatus] = useState<ReportStatus>('bedbugs')
  const [note, setNote] = useState('')
  const [unit, setUnit] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setAddress(target.label)
  }, [target])

  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function onPickFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setError(null)
    if (f && !f.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    if (f && f.size > 15 * 1024 * 1024) {
      setError('That image is too large (max 15 MB).')
      return
    }
    setFile(f)
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true)
    setError(null)

    let photoUrl: string | null = null
    try {
      if (file) {
        const stripped = await stripExifToJpeg(file)
        photoUrl = await uploadReportPhoto(stripped)
      }
      const locationId = await submitReport({
        address,
        lat: target.lat,
        lng: target.lng,
        osmId: target.osmId,
        status,
        note,
        unit,
        photoUrl,
      })
      onSubmitted(locationId)
    } catch (err) {
      // If the photo uploaded but the report insert failed, don't orphan the file.
      if (photoUrl) void removeReportPhoto(photoUrl)
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <form onSubmit={onSubmit} className="flex max-h-[88vh] flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h2 className="text-base font-semibold text-slate-900">Report an address</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-4 py-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">Address</span>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                className="w-full resize-none rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
              />
              <span className="mt-1 block text-[11px] text-slate-400">
                📍 {target.lat.toFixed(5)}, {target.lng.toFixed(5)} — adjust the text if it's off.
              </span>
            </label>

            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">What did you find?</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('bedbugs')}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    status === 'bedbugs'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  🐛 Bedbugs
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('clean')}
                  className={`rounded-md border px-3 py-2 text-sm font-medium ${
                    status === 'clean'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  ✅ No bedbugs
                </button>
              </div>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Unit / floor <span className="text-slate-400">(optional)</span>
              </span>
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="e.g. Apt 12, 3rd floor"
                className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Details <span className="text-slate-400">(optional)</span>
              </span>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="What you saw and where — bites, live bugs, blood spots, shed skins, fecal staining…"
                className="w-full resize-none rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800 focus:border-slate-400 focus:outline-none"
              />
            </label>

            <div>
              <span className="mb-1 block text-xs font-medium text-slate-500">
                Photo evidence <span className="text-slate-400">(optional, strengthens the report)</span>
              </span>
              {preview ? (
                <div className="flex items-center gap-3">
                  <img src={preview} alt="preview" className="h-16 w-16 rounded object-cover" />
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-xs text-slate-500 underline hover:text-slate-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <input
                  type="file"
                  accept="image/*"
                  onChange={onPickFile}
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:text-slate-700 hover:file:bg-slate-200"
                />
              )}
              <span className="mt-1 block text-[11px] text-slate-400">
                Location metadata (GPS) is stripped from your photo before upload.
              </span>
            </div>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <p className="text-[11px] leading-snug text-slate-400">
              Your report will be shown publicly as <strong>user-submitted and unverified</strong>,
              and will fade over ~18 months.
            </p>
          </div>

          <div className="flex gap-2 border-t border-slate-200 px-4 py-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {busy ? 'Submitting…' : 'Submit report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
