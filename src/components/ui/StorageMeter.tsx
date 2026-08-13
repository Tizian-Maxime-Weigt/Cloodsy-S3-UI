import { formatBytes } from '../../lib/format'
import { Progress, ProgressLabel, ProgressValue } from './Progress'

export function StorageMeter({
  used,
  quota,
  label = 'Storage',
  size = 'md',
}: {
  used: number
  quota: number
  label?: string | false
  size?: 'sm' | 'md'
}) {
  const hasQuota = quota > 0
  const value = hasQuota ? Math.min(used, quota) : 0
  const max = hasQuota ? quota : 100

  return (
    <Progress value={value} max={max} size={size}>
      {label ? <ProgressLabel>{label}</ProgressLabel> : null}
      <ProgressValue>
        {hasQuota
          ? `${formatBytes(used)} / ${formatBytes(quota)}`
          : `${formatBytes(used)} · Unlimited`}
      </ProgressValue>
    </Progress>
  )
}
