import { useState } from 'react'
import { TIER_META, type Tier } from '../lib/confidence'

const ORDER: Tier[] = ['heavy', 'multiple', 'single', 'clean', 'none']

export function Legend() {
  // Collapsed by default on small screens to free up map space.
  const [open, setOpen] = useState(() =>
    typeof window === 'undefined' ? true : window.innerWidth >= 640,
  )

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show the confidence legend"
        className="absolute bottom-6 left-3 z-[1000] flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-md backdrop-blur"
      >
        ⓘ
      </button>
    )
  }

  return (
    <div className="absolute bottom-6 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-md backdrop-blur">
      <div className="mb-1.5 flex items-center justify-between gap-4">
        <span className="font-semibold text-slate-700">Confidence</span>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Hide the legend"
          className="text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
      </div>
      <ul className="space-y-1">
        {ORDER.map((t) => (
          <li key={t} className="flex items-center gap-2">
            <span
              className="inline-block h-3 w-3 rounded-full ring-2 ring-white"
              style={{ background: TIER_META[t].color }}
            />
            <span className="text-slate-600">{TIER_META[t].label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 max-w-[12rem] text-[10px] leading-snug text-slate-400">
        Colour reflects recent report volume, not a verdict. Faded pins are &gt;18 months old.
      </p>
    </div>
  )
}
