import { Copy, ExternalLink, HardDrive, KeyRound, Layers, Link2 } from 'lucide-react'
import { deriveS3Endpoint, publicBucketUrl } from '../../api/s3'
import { formatBytes, formatDate } from '../../lib/format'
import { useAuth } from '../../store/auth'
import { useServers } from '../../store/ServerStore'
import { useToast } from '../../store/toast'
import type { Bucket } from '../../types'
import { Button } from '../ui/Button'

function StatusPill({
  label,
  on,
  onLabel = 'On',
  offLabel = 'Off',
}: {
  label: string
  on: boolean
  onLabel?: string
  offLabel?: string
}) {
  return (
    <div className={`status-pill ${on ? 'status-pill--on' : ''}`}>
      <span className="status-pill__label">{label}</span>
      <span className="status-pill__value">{on ? onLabel : offLabel}</span>
    </div>
  )
}

export function OverviewTab({ bucket }: { bucket: Bucket }) {
  const { activeServer } = useServers()
  const { api } = useAuth()
  const { toast } = useToast()
  const hasQuota = bucket.quotaBytes > 0
  const pct = hasQuota
    ? Math.min(100, (bucket.usageBytes / bucket.quotaBytes) * 100)
    : 0
  const storagePath = bucket.storagePath || bucket.storageDir || null
  const versioningLabel = bucket.versioning
    ? bucket.versioning.charAt(0).toUpperCase() + bucket.versioning.slice(1)
    : 'Disabled'

  const adminUrl = activeServer?.url || api.baseUrl
  const s3Endpoint = adminUrl
    ? deriveS3Endpoint(adminUrl, activeServer?.s3Url)
    : ''
  const publicBase = s3Endpoint ? publicBucketUrl(s3Endpoint, bucket.name) : ''

  const copyPublicBase = async () => {
    if (!publicBase) {
      toast('Set an S3 URL on the server first', 'error')
      return
    }
    try {
      await navigator.clipboard.writeText(publicBase)
      toast('Public bucket path copied', 'success')
    } catch {
      toast(publicBase, 'info')
    }
  }

  return (
    <div className="overview">
      <section className="panel overview__summary">
        <div className="overview__stats">
          <div>
            <div className="overview__stat-label">Objects</div>
            <div className="overview__stat-value">
              {bucket.objects.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="overview__stat-label">Storage used</div>
            <div className="overview__stat-value">
              {formatBytes(bucket.usageBytes)}
            </div>
          </div>
          <div>
            <div className="overview__stat-label">Quota</div>
            <div className="overview__stat-value">
              {hasQuota ? formatBytes(bucket.quotaBytes) : 'Unlimited'}
            </div>
          </div>
        </div>

        {hasQuota ? (
          <div className="overview__quota">
            <div className="overview__quota-meta">
              <span>
                {formatBytes(bucket.usageBytes)} of{' '}
                {formatBytes(bucket.quotaBytes)} used
              </span>
              <span>{pct < 1 && bucket.usageBytes > 0 ? '<1' : Math.round(pct)}%</span>
            </div>
            <div className="progress progress--lg">
              <div className="progress__bar" style={{ width: `${pct}%` }} />
            </div>
          </div>
        ) : (
          <p className="overview__hint">No storage quota set for this bucket.</p>
        )}
      </section>

      <section className="overview__flags">
        <StatusPill
          label="Versioning"
          on={Boolean(bucket.versioning)}
          onLabel={versioningLabel}
          offLabel="Disabled"
        />
        <StatusPill label="Public read" on={bucket.publicRead} />
        <StatusPill label="WebDAV" on={bucket.webdavEnabled} />
      </section>

      {publicBase ? (
        <section className="panel overview__public">
          <div className="overview__public-head">
            <Link2 size={16} />
            <div>
              <div className="overview__stat-label">Public path</div>
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {bucket.publicRead
                  ? 'Anonymous GET/HEAD works for objects under this URL'
                  : 'Enable Public read in Settings for anonymous access'}
              </div>
            </div>
          </div>
          <div className="overview__public-row">
            <a
              className="overview__public-link"
              href={publicBase}
              target="_blank"
              rel="noopener noreferrer"
            >
              {publicBase}
              <ExternalLink size={14} />
            </a>
            <Button variant="outline" size="sm" onClick={() => void copyPublicBase()}>
              <Copy size={14} />
              Copy
            </Button>
          </div>
        </section>
      ) : null}

      <section className="panel overview__details">
        <div className="overview__row">
          <span className="overview__row-label">
            <Layers size={14} />
            Created
          </span>
          <span className="overview__row-value">
            {formatDate(bucket.createdAt)}
          </span>
        </div>
        <div className="overview__row">
          <span className="overview__row-label">
            <KeyRound size={14} />
            Credentials
          </span>
          <span className="overview__row-value">
            {bucket.credentials} access key
            {bucket.credentials === 1 ? '' : 's'}
          </span>
        </div>
        <div className="overview__row">
          <span className="overview__row-label">Bucket ID</span>
          <span className="overview__row-value overview__row-value--muted">
            {bucket.id}
          </span>
        </div>
        {storagePath ? (
          <div className="overview__row overview__row--path">
            <span className="overview__row-label">
              <HardDrive size={14} />
              Storage path
            </span>
            <code className="overview__path" title={storagePath}>
              {storagePath}
            </code>
          </div>
        ) : null}
      </section>
    </div>
  )
}
