import { ExternalLink, Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatBytes } from '../../lib/format'
import { useBuckets } from '../../store/buckets'
import { useToast } from '../../store/toast'
import { CreateBucketDialog } from '../dialogs/CreateBucketDialog'
import { BucketCard } from './BucketCard'
import { StatCard, StatIcons } from './StatCard'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { ConfirmModal } from '../ui/Modal'
import { TopBar } from '../layout/TopBar'

export function DashboardScreen({
  onOpenBucket,
  onBack,
  serverName,
  showTopBar,
}: {
  onOpenBucket: (name: string) => void
  onBack?: () => void
  serverName?: string | null
  showTopBar?: boolean
}) {
  const {
    buckets,
    isLoading,
    serverStatus,
    updateAvailable,
    latestVersion,
    fetchBuckets,
    fetchStatus,
    createBucket,
    deleteBucket,
    error,
    clearError,
  } = useBuckets()
  const { toast } = useToast()
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteName, setDeleteName] = useState<string | null>(null)

  useEffect(() => {
    void fetchBuckets()
    void fetchStatus()
  }, [fetchBuckets, fetchStatus])

  useEffect(() => {
    if (error) {
      toast(error, 'error')
      clearError()
    }
  }, [error, toast, clearError])

  const totals = useMemo(() => {
    const objects = buckets.reduce((s, b) => s + b.objects, 0)
    const size = buckets.reduce((s, b) => s + b.usageBytes, 0)
    return { objects, size }
  }, [buckets])

  return (
    <div className="app-content">
      {showTopBar ? (
        <TopBar
          title="Dashboard"
          serverName={serverName}
          left={
            onBack ? (
              <Button variant="ghost" size="sm" onClick={onBack}>
                Disconnect
              </Button>
            ) : null
          }
        />
      ) : null}

      <div className="page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <div className="spacer" />
          <Button variant="outline" size="sm" onClick={() => void fetchBuckets()}>
            <RefreshCw size={14} />
            Refresh
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus size={14} />
            Create Bucket
          </Button>
        </div>

        {updateAvailable && latestVersion ? (
          <div className="banner banner--update">
            <div style={{ flex: 1 }}>
              Update available: v{latestVersion}
              {serverStatus?.version ? ` (running ${serverStatus.version})` : ''}
            </div>
            <a
              href="https://github.com/onaonbir/Cloodsy-S3/releases/latest"
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline btn-sm"
            >
              <ExternalLink size={14} />
              Release
            </a>
          </div>
        ) : null}

        <div className="stats-grid">
          <StatCard
            label="Status"
            value={
              serverStatus?.status === 'ok'
                ? 'Online'
                : (serverStatus?.status ?? '—')
            }
            meta={serverStatus?.version ? `v${serverStatus.version}` : undefined}
            icon={StatIcons.Activity}
          />
          <StatCard
            label="Buckets"
            value={String(buckets.length)}
            icon={StatIcons.Database}
          />
          <StatCard
            label="Objects"
            value={String(totals.objects)}
            icon={StatIcons.Box}
          />
          <StatCard
            label="Total Size"
            value={formatBytes(totals.size)}
            icon={StatIcons.HardDrive}
          />
        </div>

        {isLoading && buckets.length === 0 ? (
          <div className="empty-state">
            <div className="spinner" />
          </div>
        ) : buckets.length === 0 ? (
          <EmptyState
            title="No buckets yet"
            description="Create a bucket to start storing objects."
            action={
              <Button onClick={() => setCreateOpen(true)}>
                <Plus size={14} />
                Create Bucket
              </Button>
            }
          />
        ) : (
          <div className="buckets-grid">
            {buckets.map((b) => (
              <div key={b.id} style={{ position: 'relative' }}>
                <BucketCard bucket={b} onOpen={onOpenBucket} />
                <button
                  className="btn-icon is-danger"
                  style={{ position: 'absolute', top: 8, right: 8 }}
                  title="Delete bucket"
                  onClick={(e) => {
                    e.stopPropagation()
                    setDeleteName(b.name)
                  }}
                  type="button"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <CreateBucketDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={async (name, storageDir) => {
          const ok = await createBucket(name, storageDir)
          if (ok) toast('Bucket created', 'success')
          return ok
        }}
      />
      <ConfirmModal
        open={!!deleteName}
        title="Delete Bucket"
        message={`Permanently delete '${deleteName}'? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteName(null)}
        onConfirm={async () => {
          if (!deleteName) return
          const ok = await deleteBucket(deleteName)
          if (ok) toast('Bucket deleted', 'success')
          setDeleteName(null)
        }}
      />
    </div>
  )
}
