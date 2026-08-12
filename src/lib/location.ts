import type { BucketTab } from '../types'

const TABS: BucketTab[] = [
  'overview',
  'files',
  'credentials',
  'settings',
  'lifecycle',
  'webhooks',
]

export type AppLocation =
  | { screen: 'welcome' }
  | { screen: 'dashboard'; serverId: string }
  | { screen: 'bucket'; serverId: string; bucket: string; tab: BucketTab }
  | { screen: 'admins'; serverId: string }

function isBucketTab(v: string): v is BucketTab {
  return (TABS as string[]).includes(v)
}

/** Parse `#/s/:serverId[/b/:bucket/:tab|/admins]` */
export function parseLocationHash(hash = window.location.hash): AppLocation | null {
  const raw = hash.replace(/^#/, '').replace(/^\//, '')
  if (!raw) return null
  const parts = raw.split('/').map(decodeURIComponent)
  if (parts[0] !== 's' || !parts[1]) return null
  const serverId = parts[1]
  if (parts[2] === 'admins') return { screen: 'admins', serverId }
  if (parts[2] === 'b' && parts[3]) {
    const tab = parts[4] && isBucketTab(parts[4]) ? parts[4] : 'overview'
    return { screen: 'bucket', serverId, bucket: parts[3], tab }
  }
  return { screen: 'dashboard', serverId }
}

export function locationToHash(loc: AppLocation): string {
  if (loc.screen === 'welcome') return ''
  if (loc.screen === 'dashboard') return `#/s/${encodeURIComponent(loc.serverId)}`
  if (loc.screen === 'admins') {
    return `#/s/${encodeURIComponent(loc.serverId)}/admins`
  }
  return `#/s/${encodeURIComponent(loc.serverId)}/b/${encodeURIComponent(loc.bucket)}/${loc.tab}`
}

export function viewToLocation(state: {
  connected: boolean
  serverId?: string | null
  openBucketName: string | null
  bucketTab: BucketTab
  showAdmins: boolean
}): AppLocation {
  if (!state.connected || !state.serverId) return { screen: 'welcome' }
  if (state.showAdmins) return { screen: 'admins', serverId: state.serverId }
  if (state.openBucketName) {
    return {
      screen: 'bucket',
      serverId: state.serverId,
      bucket: state.openBucketName,
      tab: state.bucketTab,
    }
  }
  return { screen: 'dashboard', serverId: state.serverId }
}

function hrefForHash(hash: string): string {
  const { pathname, search } = window.location
  return `${pathname}${search}${hash}`
}

/** Write the location hash. `push` creates a history entry (Back/Forward). */
export function writeLocationHash(
  loc: AppLocation,
  mode: 'push' | 'replace' = 'push',
) {
  const next = locationToHash(loc)
  if (window.location.hash === next) return
  const href = hrefForHash(next)
  if (mode === 'replace') window.history.replaceState(null, '', href)
  else window.history.pushState(null, '', href)
}
