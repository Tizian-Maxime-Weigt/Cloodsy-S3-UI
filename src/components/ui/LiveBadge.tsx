import { useEffect, useState } from 'react'
import { formatRelativeTime } from '../../lib/format'
import type { LiveMode } from '../../lib/live'
import { useBuckets } from '../../store/buckets'

const LABELS: Record<Exclude<LiveMode, 'idle'>, string> = {
  connecting: 'Connecting',
  live: 'Live',
  poll: 'Auto',
}

const TITLES: Record<Exclude<LiveMode, 'idle'>, string> = {
  connecting: 'Trying the admin WebSocket, then auto-refresh',
  live: 'Realtime updates over WebSocket',
  poll: 'Refreshing stats and settings automatically',
}

export function LiveBadge() {
  const { liveMode, lastSyncedAt } = useBuckets()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 5000)
    return () => window.clearInterval(id)
  }, [])

  if (liveMode === 'idle') return null

  const synced =
    lastSyncedAt != null ? ` · ${formatRelativeTime(lastSyncedAt, now)}` : ''

  return (
    <span
      className={`live-badge live-badge--${liveMode}`}
      title={`${TITLES[liveMode]}${lastSyncedAt ? ` (updated ${formatRelativeTime(lastSyncedAt, now)})` : ''}`}
    >
      <span className="live-badge__dot" />
      {LABELS[liveMode]}
      <span className="live-badge__meta">{synced}</span>
    </span>
  )
}
