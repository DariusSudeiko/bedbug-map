import { useEffect } from 'react'

interface MetaOptions {
  title: string
  description?: string
  canonical?: string
  /** JSON-LD structured data. Memoize at the call site to avoid re-running. */
  jsonLd?: object
}

function upsertMeta(attr: 'name' | 'property', key: string, content: string): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
  return el
}

/**
 * Set the document title, description, canonical link, OG tags and optional
 * JSON-LD for the current view. Restores the title on unmount. This makes the
 * SPA's per-address pages indexable; full server-side rendering for every
 * crawler is a deploy-time step (see README).
 */
export function useDocumentMeta({ title, description, canonical, jsonLd }: MetaOptions) {
  useEffect(() => {
    const prevTitle = document.title
    document.title = title

    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:type', 'website')
    if (description) {
      upsertMeta('name', 'description', description)
      upsertMeta('property', 'og:description', description)
    }

    let canonicalEl: HTMLLinkElement | null = null
    if (canonical) {
      canonicalEl = document.createElement('link')
      canonicalEl.rel = 'canonical'
      canonicalEl.href = canonical
      document.head.appendChild(canonicalEl)
    }

    let ldEl: HTMLScriptElement | null = null
    if (jsonLd) {
      ldEl = document.createElement('script')
      ldEl.type = 'application/ld+json'
      ldEl.text = JSON.stringify(jsonLd)
      document.head.appendChild(ldEl)
    }

    return () => {
      document.title = prevTitle
      canonicalEl?.remove()
      ldEl?.remove()
    }
  }, [title, description, canonical, jsonLd])
}
