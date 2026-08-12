import type { BucketTab } from '../types'

export type LiveMode = 'idle' | 'connecting' | 'live' | 'poll'

export type LiveScreen = 'dashboard' | 'bucket' | 'admins'

export interface LiveFocus {
  screen: LiveScreen
  bucket?: string | null
  tab?: BucketTab
  prefix?: string
}

export const DEFAULT_LIVE_FOCUS: LiveFocus = { screen: 'dashboard' }

/** Convert an Admin HTTP base URL to the WebSocket endpoint. */
export function toAdminWebSocketUrl(
  adminBaseUrl: string,
  path = '/admin/ws',
): string {
  const url = new URL(adminBaseUrl)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  const basePath = url.pathname.replace(/\/$/, '')
  const wsPath = path.startsWith('/') ? path : `/${path}`
  url.pathname = `${basePath}${wsPath}`
  url.search = ''
  url.hash = ''
  return url.toString()
}

export function parseLiveMessage(raw: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(raw) as unknown
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null
    return value as Record<string, unknown>
  } catch {
    return null
  }
}

export function liveMessageType(msg: Record<string, unknown>): string {
  return String(msg.type ?? msg.event ?? msg.action ?? '')
    .trim()
    .toLowerCase()
}

export function livePayload(msg: Record<string, unknown>): Record<string, unknown> {
  const data = msg.data
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as Record<string, unknown>
  }
  const payload = msg.payload
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    return payload as Record<string, unknown>
  }
  return msg
}

export function liveBucketName(msg: Record<string, unknown>): string {
  const payload = livePayload(msg)
  return String(
    msg.bucket ?? payload.bucket ?? payload.name ?? msg.name ?? '',
  ).trim()
}

export function liveStringList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Record<string, unknown> =>
      !!item && typeof item === 'object' && !Array.isArray(item),
  )
}
