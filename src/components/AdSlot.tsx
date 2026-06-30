/**
 * The single, pluggable ad / affiliate slot (brief §6 — never more than one).
 * Start with a contextually relevant affiliate banner; swapping to AdSense or a
 * different provider should be a one-component edit. Affiliate links use
 * rel="sponsored nofollow" per SEO guidance.
 */

// TODO: replace href with a real affiliate / referral link before launch.
const AFFILIATE = {
  href: 'https://example.com/bedbug-prevention',
  headline: 'Travelling? Guard against bedbugs',
  body: 'Mattress & luggage encasements, sprays, and heat-treatment kits.',
  cta: 'See prevention gear',
}

export function AdSlot() {
  return (
    <aside className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      <span className="absolute right-2 top-2 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
        Ad
      </span>
      <a
        href={AFFILIATE.href}
        target="_blank"
        rel="sponsored nofollow noopener"
        className="block px-4 py-3 hover:bg-slate-100"
      >
        <div className="text-sm font-semibold text-slate-800">{AFFILIATE.headline}</div>
        <p className="mt-0.5 text-sm text-slate-600">{AFFILIATE.body}</p>
        <span className="mt-1 inline-block text-sm font-medium text-indigo-600">
          {AFFILIATE.cta} →
        </span>
      </a>
    </aside>
  )
}
