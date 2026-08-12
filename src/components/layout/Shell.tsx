import { Plus, Server } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BucketTab, ServerConnection } from '../../types'
import {
  parseLocationHash,
  writeLocationHash,
  type AppLocation,
} from '../../lib/location'
import { useAuth } from '../../store/auth'
import { useBuckets } from '../../store/buckets'
import { useServers } from '../../store/ServerStore'
import { useToast } from '../../store/toast'
import { AdminScreen } from '../admins/AdminScreen'
import { BucketDetailScreen } from '../bucket/BucketDetailScreen'
import { DashboardScreen } from '../dashboard/DashboardScreen'
import { AddServerDialog } from '../dialogs/AddServerDialog'
import { AppSidebar } from './AppSidebar'
import { TopBar } from './TopBar'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/EmptyState'

function useIsWide() {
  const [wide, setWide] = useState(() => window.innerWidth >= 900)
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 900)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  return wide
}

function applyLocation(
  loc: AppLocation | null,
  setters: {
    setOpenBucketName: (v: string | null) => void
    setBucketTab: (v: BucketTab) => void
    setShowAdmins: (v: boolean) => void
  },
) {
  if (!loc || loc.screen === 'welcome' || loc.screen === 'dashboard') {
    setters.setOpenBucketName(null)
    setters.setBucketTab('overview')
    setters.setShowAdmins(false)
    return
  }
  if (loc.screen === 'admins') {
    setters.setOpenBucketName(null)
    setters.setBucketTab('overview')
    setters.setShowAdmins(true)
    return
  }
  setters.setOpenBucketName(loc.bucket)
  setters.setBucketTab(loc.tab)
  setters.setShowAdmins(false)
}

export function Shell() {
  const isWide = useIsWide()
  const serversStore = useServers()
  const { servers, activeServer } = serversStore
  const auth = useAuth()
  const buckets = useBuckets()
  const { toast } = useToast()

  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [openBucketName, setOpenBucketName] = useState<string | null>(null)
  const [bucketTab, setBucketTab] = useState<BucketTab>('overview')
  const [showAdmins, setShowAdmins] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)

  useEffect(() => {
    if (isWide) setDrawerOpen(false)
  }, [isWide])

  useEffect(() => {
    if (!drawerOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [drawerOpen])

  const syncHash = useCallback(
    (serverId: string | null | undefined, state: {
      openBucketName: string | null
      bucketTab: BucketTab
      showAdmins: boolean
      connected: boolean
    }) => {
      if (!state.connected || !serverId) {
        writeLocationHash({ screen: 'welcome' })
        return
      }
      if (state.showAdmins) {
        writeLocationHash({ screen: 'admins', serverId })
        return
      }
      if (state.openBucketName) {
        writeLocationHash({
          screen: 'bucket',
          serverId,
          bucket: state.openBucketName,
          tab: state.bucketTab,
        })
        return
      }
      writeLocationHash({ screen: 'dashboard', serverId })
    },
    [],
  )

  const connectToServer = useCallback(
    async (
      server: ServerConnection,
      opts?: { restore?: AppLocation | null; resetView?: boolean },
    ) => {
      if (connectingId) return false
      setConnectingId(server.id)
      const success = await auth.connectToServer(server)
      setConnectingId(null)
      if (!success) {
        toast(auth.error ?? 'Connection failed', 'error')
        return false
      }

      setConnected(true)
      void buckets.fetchBuckets()
      void buckets.fetchStatus()

      const restore =
        opts?.restore &&
        opts.restore.screen !== 'welcome' &&
        'serverId' in opts.restore &&
        opts.restore.serverId === server.id
          ? opts.restore
          : null

      const setters = {
        setOpenBucketName,
        setBucketTab,
        setShowAdmins,
      }
      if (restore) {
        applyLocation(restore, setters)
      } else if (opts?.resetView !== false) {
        applyLocation({ screen: 'dashboard', serverId: server.id }, setters)
      }

      return true
    },
    [auth, buckets, connectingId, toast],
  )

  const restoredRef = useRef(false)
  useEffect(() => {
    if (restoredRef.current || connected || connectingId) return
    restoredRef.current = true

    const fromHash = parseLocationHash()
    const serverId =
      fromHash && fromHash.screen !== 'welcome'
        ? fromHash.serverId
        : serversStore.getLastActiveServerId()

    if (!serverId) return
    const server = servers.find((s) => s.id === serverId)
    if (!server) {
      serversStore.setActiveServer(null)
      writeLocationHash({ screen: 'welcome' })
      return
    }
    void connectToServer(server, {
      restore: fromHash && fromHash.screen !== 'welcome' ? fromHash : null,
      resetView: true,
    })
  }, [connectToServer, connected, connectingId, servers, serversStore])

  useEffect(() => {
    if (!connected) return
    syncHash(activeServer?.id, {
      connected,
      openBucketName,
      bucketTab,
      showAdmins,
    })
  }, [
    activeServer?.id,
    bucketTab,
    connected,
    openBucketName,
    showAdmins,
    syncHash,
  ])

  const disconnect = useCallback(async () => {
    await auth.disconnect()
    setConnected(false)
    setOpenBucketName(null)
    setBucketTab('overview')
    setShowAdmins(false)
    writeLocationHash({ screen: 'welcome' })
  }, [auth])

  const selectServer = (server: ServerConnection) => {
    setDrawerOpen(false)
    if (connected && activeServer?.id === server.id) {
      setOpenBucketName(null)
      setShowAdmins(false)
      setBucketTab('overview')
      return
    }
    void connectToServer(server, { resetView: true })
  }

  const openBucket = (name: string) => {
    setOpenBucketName(name)
    setBucketTab('overview')
    setShowAdmins(false)
    setDrawerOpen(false)
  }

  const closeBucket = () => {
    setOpenBucketName(null)
    setBucketTab('overview')
    setShowAdmins(false)
    void buckets.fetchBuckets()
  }

  const onBucketTabChange = (t: BucketTab) => {
    setBucketTab(t)
    setShowAdmins(false)
  }

  const pageTitle = !connected
    ? 'Cloodsy S3'
    : showAdmins
      ? 'Admin Users'
      : openBucketName ?? 'Dashboard'

  return (
    <div className="app-shell">
      <TopBar
        title={pageTitle}
        serverName={connected ? activeServer?.name : undefined}
        onMenu={!isWide ? () => setDrawerOpen((v) => !v) : undefined}
        menuOpen={drawerOpen}
      />
      <div className="app-shell__body">
        {drawerOpen && !isWide ? (
          <button
            className="drawer-backdrop"
            type="button"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
        ) : null}
        <AppSidebar
          open={isWide || drawerOpen}
          connectingId={connectingId}
          showBucketNav={isWide}
          onNavigate={() => setDrawerOpen(false)}
          activeServerId={connected ? activeServer?.id ?? null : null}
          onServerTap={selectServer}
          onDisconnect={connected ? () => void disconnect() : undefined}
          openBucketName={openBucketName}
          activeBucketTab={bucketTab}
          onBucketTabChanged={onBucketTabChange}
          onBucketClose={closeBucket}
          showAdmins={showAdmins}
          onAdminsTap={
            connected
              ? () => {
                  setShowAdmins(true)
                  setOpenBucketName(null)
                }
              : undefined
          }
        />
        {!connected ? (
          <Welcome
            onAdd={() => setAddOpen(true)}
            connectingId={connectingId}
            onServerTap={selectServer}
          />
        ) : showAdmins ? (
          <AdminScreen />
        ) : openBucketName ? (
          <BucketDetailScreen
            bucketName={openBucketName}
            tab={bucketTab}
            onTabChange={onBucketTabChange}
            onBack={closeBucket}
            embedded
            showMobileTabs={!isWide}
          />
        ) : (
          <DashboardScreen onOpenBucket={openBucket} />
        )}
      </div>
      <AddServerDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function Welcome({
  onAdd,
  connectingId,
  onServerTap,
}: {
  onAdd: () => void
  connectingId: string | null
  onServerTap: (server: ServerConnection) => void
}) {
  const { servers } = useServers()
  return (
    <div className="app-content">
      <div className={`page welcome ${servers.length > 0 ? 'welcome--list' : ''}`}>
        {servers.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Welcome to Cloodsy S3"
            description="Add a server to manage buckets, files, credentials, lifecycle rules, and webhooks."
            action={
              <Button onClick={onAdd}>
                <Plus size={14} />
                Add Server
              </Button>
            }
          />
        ) : (
          <>
            <div className="page-header">
              <h1>{connectingId ? 'Connecting…' : 'Select a server'}</h1>
              <div className="spacer" />
              <Button size="sm" onClick={onAdd}>
                <Plus size={14} />
                Add Server
              </Button>
            </div>
            <p className="field-hint">
              Choose a saved admin endpoint. You can edit or remove servers from the sidebar.
            </p>
            <div className="server-picker">
              {servers.map((server) => (
                <button
                  key={server.id}
                  className="panel list-card server-picker__card"
                  onClick={() => onServerTap(server)}
                  type="button"
                  disabled={!!connectingId}
                >
                  <div className="list-card__header">
                    {connectingId === server.id ? (
                      <span className="spinner spinner--sm" aria-hidden />
                    ) : (
                      <span className="nav-item__dot" />
                    )}
                    <strong>{server.name}</strong>
                    <span className="spacer" />
                    <span className="badge">{server.username}</span>
                  </div>
                  <div className="server-picker__meta">{server.url}</div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
