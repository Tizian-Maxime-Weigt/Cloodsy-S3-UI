import { formatBytes } from '../../lib/format'
import { Progress, ProgressLabel, ProgressValue } from './Progress'

function formatUsedPercent(used: number, quota: number): string {
  const pct = (used / quota) * 100
  if (used > 0 && pct < 1) return '<1%'
  return `${Math.round(pct)}%`
}

export function StorageMeter({
  used,
  quota,
  label = 'Storage',
  size = 'md',
  layout = 'stack',
}: {
  used: number
  quota: number
  label?: string | false
  size?: 'sm' | 'md'
  layout?: 'stack' | 'inline'
}) {
  const hasQuota = quota > 0
  const value = hasQuota ? Math.min(used, quota) : 0
  const max = hasQuota ? quota : 100

  return (
    <Progress value={value} max={max} size={size} layout={layout}>
      {label ? <ProgressLabel>{label}</ProgressLabel> : null}
      <ProgressValue>
        {hasQuota
          ? `${formatBytes(used)} / ${formatBytes(quota)} (${formatUsedPercent(used, quota)})`
          : `${formatBytes(used)} · Unlimited`}
      </ProgressValue>
    </Progress>
  )
}
