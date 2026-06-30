import type { MapView } from './map/BedbugMap'

const OPTIONS: { value: MapView; label: string }[] = [
  { value: 'pins', label: '📍 Pins' },
  { value: 'heat', label: '🔥 Heatmap' },
]

export function ViewToggle({ view, onChange }: { view: MapView; onChange: (v: MapView) => void }) {
  return (
    <div className="absolute left-3 top-16 z-[1100] inline-flex overflow-hidden rounded-lg border border-slate-200 bg-white text-sm shadow-md">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 ${
            view === o.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
