// TODO: replace with a real monitored contact/takedown address before launch.
const TAKEDOWN_EMAIL = 'takedown@example.com'

export function SiteFooter() {
  return (
    <footer className="z-20 flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-2 text-xs text-slate-500">
      <span>
        Crowdsourced, unverified reports — not a verdict on any property. Reports fade after ~18
        months.
      </span>
      {/* Deliberately low-key: a legal contact channel must exist (DSA notice-and-takedown),
          but it must not read as a one-click "remove my bad reviews" button. */}
      <a
        className="shrink-0 text-slate-300 hover:text-slate-500"
        href={`mailto:${TAKEDOWN_EMAIL}?subject=Bedbug%20Map%20%E2%80%94%20legal%20notice`}
      >
        Legal
      </a>
    </footer>
  )
}
