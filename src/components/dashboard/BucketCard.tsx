import { Globe, HardDrive, KeyRound, Layers, Trash2 } from 'lucide-react'
import type { Bucket } from '../../types'
import { formatBytes, quotaTone } from '../../lib/format'

export function BucketCard({
  bucket,
  onOpen,
  onDelete,
}: {
  bucket: Bucket
  onOpen: (name: string) => void
  onDelete?: (name: string) => void
}) {
  const pct = bucket.quotaBytes > 0 ? Math.min(1, bucket.usageBytes / bucket.quotaBytes) : 0
  const tone = quotaTone(bucket.usageBytes, bucket.quotaBytes)
  const barClass =
    tone === 'danger' ? 'progress__bar--danger' : tone === 'warn' ? 'progress__bar--warn' : ''

  return (
    <div className="bucket-card-wrap">
      <button className="panel bucket-card" onClick={() => onOpen(bucket.name)} type="button">
        <div className="bucket-card__title">{bucket.name}</div>
        <div className="bucket-card__meta">
          <span>{bucket.objects.toLocaleString()} objects</span>
          <span>{formatBytes(bucket.usageBytes)}</span>
          {bucket.versioning && /enabled/i.test(bucket.versioning) ? (
            <span className="badge">
              <Layers size={12} />
              Versioned
            </span>
          ) : null}
          {bucket.publicRead ? (
            <span className="badge">
              <Globe size={12} />
              Public
            </span>
          ) : null}
          {bucket.webdavEnabled ? (
            <span className="badge">
              <HardDrive size={12} />
              WebDAV
            </span>
          ) : null}
          <span className="badge">
            <KeyRound size={12} />
            {bucket.credentials} {bucket.credentials === 1 ? 'key' : 'keys'}
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
              <div className={`progress__bar ${barClass}`} style={{ width: `${pct * 100}%` }} />
            </div>
          </div>
        ) : null}
      </button>
      {onDelete ? (
        <button
          className="btn-icon is-danger bucket-card__delete"
          type="button"
          title="Delete bucket"
          aria-label={`Delete bucket ${bucket.name}`}
          onClick={() => onDelete(bucket.name)}
        >
          <Trash2 size={14} />
        </button>
      ) : null}
    </div>
  )
}
