import { Plus, RefreshCw } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { formatBytes } from '../../lib/format'
import { useBuckets } from '../../store/buckets'
import { useToast } from '../../store/toast'
import { CreateBucketDialog } from '../dialogs/CreateBucketDialog'
import { BucketCard } from './BucketCard'
import { StatCard, StatIcons } from './StatCard'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'
import { SearchField } from '../ui/Field'
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
  const [query, setQuery] = useState('')

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return buckets
    return buckets.filter((b) => b.name.toLowerCase().includes(q))
  }, [buckets, query])

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
          <SearchField
            value={query}
            onChange={setQuery}
            placeholder="Search buckets"
          />
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
              Release notes
            </a>
          </div>
        ) : null}

        <div className="stats-grid">
          <StatCard
            label="Status"
            value={
              serverStatus?.status === 'ok'
                ? 'Online'
                : (serverStatus?.status ?? (isLoading ? '…' : '—'))
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
            value={totals.objects.toLocaleString()}
            icon={StatIcons.Box}
          />
          <StatCard
            label="Total Size"
            value={formatBytes(totals.size)}
            icon={StatIcons.HardDrive}
          />
        </div>

        {isLoading && buckets.length === 0 ? (
          <div className="buckets-grid">
            <div className="panel skeleton skeleton--card" />
            <div className="panel skeleton skeleton--card" />
            <div className="panel skeleton skeleton--card" />
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
        ) : filtered.length === 0 ? (
          <EmptyState
            title="No matching buckets"
            description={`Nothing matches “${query.trim()}”.`}
            action={
              <Button variant="outline" onClick={() => setQuery('')}>
                Clear search
              </Button>
            }
          />
        ) : (
          <div className="buckets-grid">
            {filtered.map((b) => (
              <BucketCard
                key={b.id}
                bucket={b}
                onOpen={onOpenBucket}
                onDelete={setDeleteName}
              />
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
        message={`Permanently delete '${deleteName}' and all of its objects? This cannot be undone.`}
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
