import { KeyRound, Layers } from 'lucide-react'
import type { Bucket } from '../../types'
import { formatBytes } from '../../lib/format'

export function BucketCard({
  bucket,
  onOpen,
}: {
  bucket: Bucket
  onOpen: (name: string) => void
}) {
  const pct = bucket.quotaBytes > 0 ? Math.min(1, bucket.usageBytes / bucket.quotaBytes) : 0

  return (
    <button className="panel bucket-card" onClick={() => onOpen(bucket.name)} type="button">
      <div className="bucket-card__title">{bucket.name}</div>
      <div className="bucket-card__meta">
        <span>{bucket.objects} objects</span>
        <span>{formatBytes(bucket.usageBytes)}</span>
        {bucket.versioning ? (
          <span className="badge">
            <Layers size={12} />
            {bucket.versioning}
          </span>
        ) : null}
        <span className="badge">
          <KeyRound size={12} />
          {bucket.credentials}
        </span>
      </div>
      {bucket.quotaBytes > 0 ? (
        <div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'var(--muted)',
              marginBottom: 4,
            }}
          >
            <span>Quota</span>
            <span>
              {formatBytes(bucket.usageBytes)} / {formatBytes(bucket.quotaBytes)}
            </span>
          </div>
          <div className="progress">
            <div className="progress__bar" style={{ width: `${pct * 100}%` }} />
          </div>
        </div>
      ) : null}
    </button>
  )
}
