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
}) {
  const { servers, deleteServer } = useServers()
  const theme = useTheme()
  const [addOpen, setAddOpen] = useState(false)
  const [editServer, setEditServer] = useState<ServerConnection | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ServerConnection | null>(null)

  const ThemeIcon = theme.mode === 'light' ? Sun : theme.mode === 'dark' ? Moon : Monitor

  return (
    <aside className="sidebar">
      {openBucketName ? (
        <>
          <div style={{ padding: '8px 4px 4px 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '0 8px' }}>
              <button className="btn-icon" onClick={onBucketClose} title="Back to dashboard">
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
            <div style={{ padding: '4px 8px 8px' }}>
              {BUCKET_TABS.map((tab) => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    className={`nav-item ${activeBucketTab === tab.id ? 'is-active' : ''}`}
                    onClick={() => onBucketTabChanged(tab.id)}
                    type="button"
                  >
                    <Icon size={16} />
                    {tab.label}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ borderTop: '1px solid var(--border)' }} />
        </>
      ) : null}

      <div className="sidebar__section-label">
        SERVERS
        <span className="spacer" />
        <button className="btn-icon" onClick={() => setAddOpen(true)} title="Add Server">
          <Plus size={16} />
        </button>
      </div>

      <div className="sidebar__scroll">
        {servers.map((server) => {
          const isActive = server.id === activeServerId
          return (
            <div key={server.id} className="server-item">
              <button
                className={`nav-item ${isActive ? 'is-active' : ''}`}
                onClick={() => onServerTap(server)}
                type="button"
              >
                <span className={`nav-item__dot ${isActive ? 'is-online' : ''}`} />
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
                <span className="server-item__actions">
                  <span
                    className="btn-icon"
                    role="button"
                    tabIndex={0}
                    title="Edit"
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditServer(server)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        setEditServer(server)
                      }
                    }}
                  >
                    <Pencil size={14} />
                  </span>
                  <span
                    className="btn-icon is-danger"
                    role="button"
                    tabIndex={0}
                    title="Delete"
                    onClick={(e) => {
                      e.stopPropagation()
                      setDeleteTarget(server)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        setDeleteTarget(server)
                      }
                    }}
                  >
                    <Trash2 size={14} />
                  </span>
                </span>
              </button>
            </div>
          )
        })}
      </div>

      <div className="sidebar__footer">
        {activeServerId && onAdminsTap ? (
          <>
            <div className="sidebar__section-label" style={{ padding: '4px 8px 6px' }}>
              SETTINGS
            </div>
            <button
              className={`nav-item ${showAdmins ? 'is-active' : ''}`}
              onClick={onAdminsTap}
              type="button"
            >
              <Shield size={16} />
              Admin Users
            </button>
          </>
        ) : null}

        <button className="nav-item" onClick={theme.cycle} type="button">
          <ThemeIcon size={16} />
          {theme.label}
        </button>

        {activeServerId && onDisconnect ? (
          <button className="nav-item is-destructive" onClick={onDisconnect} type="button">
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
        message={`Remove '${deleteTarget?.name}'?`}
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
