import {
  ArrowLeft,
  FolderOpen,
  Info,
  Key,
  LogOut,
  Monitor,
  Moon,
  Plus,
  Settings,
  Shield,
  Sun,
  Timer,
  Trash2,
  Pencil,
  Webhook,
} from 'lucide-react'
import { useState } from 'react'
import type { BucketTab, ServerConnection } from '../../types'
import { useServers } from '../../store/ServerStore'
import { useTheme } from '../../store/theme'
import { AddServerDialog } from '../dialogs/AddServerDialog'
import { ConfirmModal } from '../ui/Modal'

const BUCKET_TABS: { id: BucketTab; label: string; icon: typeof Info }[] = [
  { id: 'overview', label: 'Overview', icon: Info },
  { id: 'files', label: 'Files', icon: FolderOpen },
  { id: 'credentials', label: 'Credentials', icon: Key },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'lifecycle', label: 'Lifecycle', icon: Timer },
  { id: 'webhooks', label: 'Webhooks', icon: Webhook },
]

export function AppSidebar({
  activeServerId,
  onServerTap,
  onDisconnect,
  openBucketName,
  activeBucketTab,
  onBucketTabChanged,
  onBucketClose,
  showAdmins,
  onAdminsTap,
  connectingId,
  showBucketNav = true,
  open = true,
  onNavigate,
}: {
  activeServerId: string | null
  onServerTap: (server: ServerConnection) => void
  onDisconnect?: () => void
  openBucketName: string | null
  activeBucketTab: BucketTab
  onBucketTabChanged: (tab: BucketTab) => void
  onBucketClose?: () => void
  showAdmins: boolean
  onAdminsTap?: () => void
  connectingId?: string | null
  showBucketNav?: boolean
  open?: boolean
  onNavigate?: () => void
}) {
  const { servers, deleteServer } = useServers()
  const theme = useTheme()
  const [addOpen, setAddOpen] = useState(false)
  const [editServer, setEditServer] = useState<ServerConnection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServerConnection | null>(null)

  const ThemeIcon = theme.mode === 'light' ? Sun : theme.mode === 'dark' ? Moon : Monitor

  return (
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Sidebar">
      {showBucketNav && openBucketName ? (
        <>
          <div style={{ padding: '8px 4px 4px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px' }}>
              <button
                className="btn-icon"
                onClick={() => {
                  onBucketClose?.()
                  onNavigate?.()
                }}
                title="Back to dashboard"
                aria-label="Back to dashboard"
                type="button"
              >
                <ArrowLeft size={18} />
              </button>
              <strong
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  fontSize: 13,
                }}
              >
                {openBucketName}
              </strong>
            </div>
            <nav style={{ padding: '4px 8px 8px' }} aria-label="Bucket sections">
              {BUCKET_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={`nav-item ${activeBucketTab === tab.id ? 'is-active' : ''}`}
                    onClick={() => {
                      onBucketTabChanged(tab.id)
                      onNavigate?.()
                    }}
                    type="button"
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </nav>
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }} />
        </>
      ) : null}

      <div className="sidebar__section-label">
        SERVERS
        <span className="spacer" />
        <button
          className="btn-icon"
          onClick={() => setAddOpen(true)}
          title="Add Server"
          aria-label="Add server"
          type="button"
        >
          <Plus size={16} />
        </button>
      </div>

      <div className="sidebar__scroll">
        {servers.length === 0 ? (
          <p className="field-hint" style={{ padding: '8px 10px' }}>
            No servers yet. Add an admin endpoint to get started.
          </p>
        ) : (
          servers.map((server) => {
            const isActive = server.id === activeServerId
            const isConnecting = connectingId === server.id
            return (
              <div
                key={server.id}
                className={`server-item ${isActive ? 'is-active' : ''}`}
              >
                <button
                  className={`nav-item server-item__main ${isActive ? 'is-active' : ''}`}
                  onClick={() => {
                    onServerTap(server)
                    onNavigate?.()
                  }}
                  type="button"
                  disabled={!!connectingId}
                  aria-current={isActive ? 'true' : undefined}
                >
                  {isConnecting ? (
                    <span className="spinner spinner--sm" aria-hidden />
                  ) : (
                    <span
                      className={`nav-item__dot ${isActive ? 'is-online' : ''}`}
                      title={isActive ? 'Connected' : 'Saved'}
                    />
                  )}
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 1,
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    <span
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        width: '100%',
                      }}
                    >
                      {server.name}
                    </span>
                    <span className="server-item__meta">
                      {server.s3Url?.trim()
                        ? server.s3Url.replace(/^https?:\/\//, '')
                        : server.url.replace(/^https?:\/\//, '')}
                    </span>
                  </span>
                </button>
                <span className="server-item__actions">
                  <button
                    className="btn-icon"
                    type="button"
                    title="Edit server"
                    aria-label={`Edit ${server.name}`}
                    onClick={() => setEditServer(server)}
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn-icon is-danger"
                    type="button"
                    title="Delete server"
                    aria-label={`Delete ${server.name}`}
                    onClick={() => setDeleteTarget(server)}
                  >
                    <Trash2 size={14} />
                  </button>
                </span>
              </div>
            )
          })
        )}
      </div>

      <div className="sidebar__footer">
        {activeServerId && onAdminsTap ? (
          <>
            <div className="sidebar__section-label" style={{ padding: '4px 8px 6px' }}>
              SETTINGS
            </div>
            <button
              className={`nav-item ${showAdmins ? 'is-active' : ''}`}
              onClick={() => {
                onAdminsTap()
                onNavigate?.()
              }}
              type="button"
            >
              <Shield size={16} />
              Admin Users
            </button>
          </>
        ) : null}

        <button
          className="nav-item"
          onClick={theme.cycle}
          type="button"
          title="Cycle light, dark, and system theme"
        >
          <ThemeIcon size={16} />
          Theme: {theme.label}
        </button>

        {activeServerId && onDisconnect ? (
          <button
            className="nav-item is-destructive"
            onClick={() => {
              onDisconnect()
              onNavigate?.()
            }}
            type="button"
          >
            <LogOut size={16} />
            Disconnect
          </button>
        ) : null}
      </div>

      <AddServerDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <AddServerDialog
        open={!!editServer}
        existing={editServer}
        onClose={() => setEditServer(null)}
      />
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete Server"
        message={`Remove '${deleteTarget?.name}' from this browser? You can add it again later.`}
        confirmLabel="Delete"
        danger
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) deleteServer(deleteTarget.id)
          setDeleteTarget(null)
        }}
      />
    </aside>
  )
}

export { BUCKET_TABS }
