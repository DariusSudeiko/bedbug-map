import { TIER_META, type Tier } from '../lib/confidence'

const ORDER: Tier[] = ['heavy', 'multiple', 'single', 'clean', 'none']

export function Legend() {
  return (
    <div className="absolute bottom-6 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 p-3 text-xs shadow-md backdrop-blur">
      <div className="mb-1.5 font-semibold text-slate-700">Confidence</div>
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
