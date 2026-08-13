import { assertHttpEndpointUrl } from './format'

const VIEW_PREFIX = '#/view?'

/** `#/view?u=<encoded http(s) object URL>` — used to render HTML instead of downloading. */
export function parseViewHash(hash = window.location.hash): string | null {
  if (!hash.startsWith(VIEW_PREFIX) && hash !== '#/view') return null
  const query = hash.slice(VIEW_PREFIX.length)
  const url = new URLSearchParams(query).get('u')?.trim()
  if (!url) return null
  try {
    return assertHttpEndpointUrl(url, 'Object URL')
  } catch {
    return null
  }
}

export function buildViewHref(objectUrl: string): string {
  const { origin, pathname, search } = window.location
  return `${origin}${pathname}${search}#/view?u=${encodeURIComponent(objectUrl)}`
}

export function objectKeyFromUrl(objectUrl: string): string {
  try {
    const path = new URL(objectUrl).pathname
    const parts = path.split('/').filter(Boolean)
    if (parts.length < 2) return decodeURIComponent(parts[0] || '')
    return parts.slice(1).map(decodeURIComponent).join('/')
  } catch {
    return ''
  }
}
