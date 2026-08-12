import { ArrowLeft, RefreshCw } from 'lucide-react'
import { useEffect } from 'react'
import type { BucketTab } from '../../types'
import { useBuckets } from '../../store/buckets'
import { useToast } from '../../store/toast'
import { BUCKET_TABS } from '../layout/AppSidebar'
import { TopBar } from '../layout/TopBar'
import { Button } from '../ui/Button'
import { CredentialsTab } from './CredentialsTab'
import { FilesTab } from './FilesTab'
import { LifecycleTab } from './LifecycleTab'
import { OverviewTab } from './OverviewTab'
import { SettingsTab } from './SettingsTab'
import { WebhooksTab } from './WebhooksTab'

export function BucketDetailScreen({
  bucketName,
  tab,
  onTabChange,
  onBack,
  embedded,
  showMobileTabs,
}: {
  bucketName: string
  tab: BucketTab
  onTabChange: (tab: BucketTab) => void
  onBack?: () => void
  embedded?: boolean
  showMobileTabs?: boolean
}) {
  const { selectedBucket, fetchBucketDetail, isLoading, error, clearError } = useBuckets()
  const { toast } = useToast()

  useEffect(() => {
    void fetchBucketDetail(bucketName)
  }, [bucketName, fetchBucketDetail])

  useEffect(() => {
    if (error) {
      toast(error, 'error')
      clearError()
    }
  }, [error, toast, clearError])

  const bucket = selectedBucket?.name === bucketName ? selectedBucket : null

  return (
    <div className="app-content">
      {!embedded ? (
        <TopBar
          title={bucketName}
          left={
            onBack ? (
              <button className="btn-icon" onClick={onBack} type="button" aria-label="Back">
                <ArrowLeft size={18} />
              </button>
            ) : null
          }
          right={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchBucketDetail(bucketName)}
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
            </Button>
          }
        />
      ) : null}

      {showMobileTabs ? (
        <div className="tab-bar" role="tablist" aria-label="Bucket sections">
          {BUCKET_TABS.map((t) => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                className={tab === t.id ? 'is-active' : ''}
                onClick={() => onTabChange(t.id)}
              >
                <Icon size={14} />
                {t.label}
              </button>
            )
          })}
        </div>
      ) : null}

      <div className="page">
        {embedded && !showMobileTabs ? (
          <div className="page-header">
            <h1>{bucketName}</h1>
            <div className="spacer" />
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchBucketDetail(bucketName)}
            >
              <RefreshCw size={14} />
              Refresh
            </Button>
          </div>
        ) : showMobileTabs ? (
          <div className="page-header" style={{ padding: 0, marginTop: -8 }}>
            <Button variant="ghost" size="sm" onClick={onBack} aria-label="Back to dashboard">
              <ArrowLeft size={14} />
              Buckets
            </Button>
            <div className="spacer" />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void fetchBucketDetail(bucketName)}
              aria-label="Refresh"
            >
              <RefreshCw size={14} />
            </Button>
          </div>
        ) : null}

        {isLoading && !bucket ? (
          <div className="empty-state">
            <div className="spinner" />
            <p>Loading bucket…</p>
          </div>
        ) : !bucket ? (
          <div className="empty-state">Bucket not found</div>
        ) : (
          <>
            {tab === 'overview' ? <OverviewTab bucket={bucket} /> : null}
            {tab === 'files' ? <FilesTab bucketName={bucketName} /> : null}
            {tab === 'credentials' ? <CredentialsTab bucketName={bucketName} /> : null}
            {tab === 'settings' ? <SettingsTab bucket={bucket} /> : null}
            {tab === 'lifecycle' ? <LifecycleTab bucketName={bucketName} /> : null}
            {tab === 'webhooks' ? <WebhooksTab bucketName={bucketName} /> : null}
          </>
        )}
      </div>
    </div>
  )
}
