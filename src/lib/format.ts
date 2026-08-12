export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, i)
  return `${value < 10 && i > 0 ? value.toFixed(1) : Math.round(value)} ${units[i]}`
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString()
}

/** Ensure endpoint has a scheme; bare hosts get https:// */
export function normalizeEndpointUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/$/, '')
  if (!trimmed) return ''
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed
  return `https://${trimmed}`
}

/**
 * Normalize and accept only http(s) endpoints.
 * Rejects javascript:, data:, file:, etc.
 */
export function assertHttpEndpointUrl(raw: string, label = 'URL'): string {
  const normalized = normalizeEndpointUrl(raw)
  if (!normalized) throw new Error(`${label} is required`)
  let parsed: URL
  try {
    parsed = new URL(normalized)
  } catch {
    throw new Error(`${label} is not a valid URL`)
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(`${label} must use http or https`)
  }
  if (!parsed.hostname) throw new Error(`${label} is missing a host`)
  return normalized
}

export function fileNameFromKey(key: string): string {
  const parts = key.split('/')
  return parts[parts.length - 1] || key
}

export function fileExtension(key: string): string {
  const name = fileNameFromKey(key)
  const idx = name.lastIndexOf('.')
  if (idx < 0) return ''
  return name.slice(idx + 1).toLowerCase()
}

export function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map((e) => parseInt(e, 10) || 0)
  const bParts = b.split('.').map((e) => parseInt(e, 10) || 0)
  for (let i = 0; i < 3; i++) {
    const av = aParts[i] ?? 0
    const bv = bParts[i] ?? 0
    if (av < bv) return -1
    if (av > bv) return 1
  }
  return 0
}

export function generateId(): string {
  return crypto.randomUUID()
}
