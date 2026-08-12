import { Plus, Server } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { BucketTab, ServerConnection } from '../../types'
import {
  parseLocationHash,
  viewToLocation,
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
import { ConnectPasswordDialog } from '../dialogs/ConnectPasswordDialog'
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
    setMobileView: (v: 'servers' | 'dashboard' | 'bucket' | 'admins') => void
  },
) {
  if (!loc || loc.screen === 'welcome' || loc.screen === 'dashboard') {
    setters.setOpenBucketName(null)
    setters.setBucketTab('overview')
    setters.setShowAdmins(false)
    setters.setMobileView('dashboard')
    return
  }
  if (loc.screen === 'admins') {
    setters.setOpenBucketName(null)
    setters.setBucketTab('overview')
    setters.setShowAdmins(true)
    setters.setMobileView('admins')
    return
  }
  setters.setOpenBucketName(loc.bucket)
  setters.setBucketTab(loc.tab)
  setters.setShowAdmins(false)
  setters.setMobileView('bucket')
}

export function Shell() {
  const isWide = useIsWide()
  const serversStore = useServers()
  const { servers, activeServer } = serversStore
  const auth = useAuth()
  const buckets = useBuckets()
  const { setLiveFocus } = buckets
  const { toast } = useToast()

  const [connectingId, setConnectingId] = useState<string | null>(null)
  const [connected, setConnected] = useState(false)
  const [openBucketName, setOpenBucketName] = useState<string | null>(null)
  const [bucketTab, setBucketTab] = useState<BucketTab>('overview')
  const [showAdmins, setShowAdmins] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [passwordPrompt, setPasswordPrompt] = useState<{
    server: ServerConnection
    restore?: AppLocation | null
    resetView?: boolean
  } | null>(null)
  const [promptError, setPromptError] = useState<string | null>(null)
  const [mobileView, setMobileView] = useState<'servers' | 'dashboard' | 'bucket' | 'admins'>(
    'servers',
  )

  useEffect(() => {
    if (!connected) {
      setLiveFocus(null)
      return
    }
    if (showAdmins) {
      setLiveFocus({ screen: 'admins' })
      return
    }
    if (openBucketName) {
      setLiveFocus({
        screen: 'bucket',
        bucket: openBucketName,
        tab: bucketTab,
      })
      return
    }
    setLiveFocus({ screen: 'dashboard' })
  }, [bucketTab, connected, openBucketName, setLiveFocus, showAdmins])

  const connectToServer = useCallback(
    async (
      server: ServerConnection,
      opts?: {
        restore?: AppLocation | null
        resetView?: boolean
        auth?: { password?: string; rememberPassword?: boolean }
      },
    ) => {
      if (connectingId) return false
      setConnectingId(server.id)
      const result = await auth.connectToServer(server, opts?.auth)
      setConnectingId(null)
      if (!result.ok) {
        if (result.needsPassword) {
          setPasswordPrompt({
            server,
            restore: opts?.restore,
            resetView: opts?.resetView,
          })
          setPromptError(null)
          return false
        }
        if (passwordPrompt?.server.id === server.id) {
          setPromptError(result.error)
        } else {
          toast(result.error, 'error')
        }
        return false
      }

      setPasswordPrompt(null)
      setPromptError(null)
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
        setMobileView,
      }
      if (restore) {
        applyLocation(restore, setters)
      } else if (opts?.resetView !== false) {
        applyLocation({ screen: 'dashboard', serverId: server.id }, setters)
      }

      return true
    },
    [auth, buckets, connectingId, passwordPrompt?.server.id, toast],
  )

  // Restore from URL hash (or last active server) after reload
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
      writeLocationHash({ screen: 'welcome' }, 'replace')
      return
    }
    void connectToServer(server, {
      restore: fromHash && fromHash.screen !== 'welcome' ? fromHash : null,
      resetView: true,
    })
  }, [connectToServer, connected, connectingId, servers, serversStore])

  const disconnect = useCallback(async () => {
    await auth.disconnect()
    setConnected(false)
    setOpenBucketName(null)
    setBucketTab('overview')
    setShowAdmins(false)
    setMobileView('servers')
    writeLocationHash({ screen: 'welcome' }, 'replace')
  }, [auth])

  const hashReadyRef = useRef(false)

  // Keep hash in sync with current view (push so Back/Forward work)
  useEffect(() => {
    if (!connected) {
      hashReadyRef.current = false
      return
    }
    writeLocationHash(
      viewToLocation({
        connected,
        serverId: activeServer?.id,
        openBucketName,
        bucketTab,
        showAdmins,
      }),
      hashReadyRef.current ? 'push' : 'replace',
    )
    hashReadyRef.current = true
  }, [activeServer?.id, bucketTab, connected, openBucketName, showAdmins])

  useEffect(() => {
    const onPop = () => {
      const loc = parseLocationHash()
      if (!loc || loc.screen === 'welcome') {
        if (connected) void disconnect()
        else {
          setOpenBucketName(null)
          setShowAdmins(false)
          setMobileView('servers')
        }
        return
      }
      const server = servers.find((s) => s.id === loc.serverId)
      if (!server) {
        writeLocationHash({ screen: 'welcome' }, 'replace')
        return
      }
      if (connected && activeServer?.id === server.id) {
        applyLocation(loc, {
          setOpenBucketName,
          setBucketTab,
          setShowAdmins,
          setMobileView,
        })
        return
      }
      void connectToServer(server, { restore: loc, resetView: false })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [activeServer?.id, connected, connectToServer, disconnect, servers])

  const openBucket = (name: string) => {
    setOpenBucketName(name)
    setBucketTab('overview')
    setShowAdmins(false)
    if (!isWide) setMobileView('bucket')
  }

  const closeBucket = () => {
    setOpenBucketName(null)
    setBucketTab('overview')
    setShowAdmins(false)
    void buckets.fetchBuckets()
    if (!isWide) setMobileView('dashboard')
  }

  const onBucketTabChange = (t: BucketTab) => {
    setBucketTab(t)
    setShowAdmins(false)
  }

  const shellDialogs = (
    <>
      <AddServerDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <ConnectPasswordDialog
        open={!!passwordPrompt}
        server={passwordPrompt?.server ?? null}
        error={promptError}
        busy={connectingId === passwordPrompt?.server.id}
        onClose={() => {
          setPasswordPrompt(null)
          setPromptError(null)
        }}
        onSubmit={(password, remember) => {
          if (!passwordPrompt) return
          void connectToServer(passwordPrompt.server, {
            restore: passwordPrompt.restore,
            resetView: passwordPrompt.resetView,
            auth: { password, rememberPassword: remember },
          })
        }}
      />
    </>
  )

  // Desktop layout
  if (isWide) {
    return (
      <div className="app-shell">
        <TopBar serverName={activeServer?.name} />
        <div className="app-shell__body">
          <AppSidebar
            activeServerId={connected ? activeServer?.id ?? null : null}
            onServerTap={(s) => void connectToServer(s, { resetView: true })}
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
            <Welcome onAdd={() => setAddOpen(true)} connectingId={connectingId} />
          ) : showAdmins ? (
            <AdminScreen />
          ) : openBucketName ? (
            <BucketDetailScreen
              bucketName={openBucketName}
              tab={bucketTab}
              onTabChange={onBucketTabChange}
              onBack={closeBucket}
              embedded
            />
          ) : (
            <DashboardScreen onOpenBucket={openBucket} />
          )}
        </div>
        {shellDialogs}
      </div>
    )
  }

  // Mobile layout
  if (mobileView === 'bucket' && openBucketName) {
    return (
      <div className="app-shell">
        <BucketDetailScreen
          bucketName={openBucketName}
          tab={bucketTab}
          onTabChange={onBucketTabChange}
          onBack={closeBucket}
          showMobileTabs
        />
        {shellDialogs}
      </div>
    )
  }

  if (mobileView === 'admins' && connected) {
    return (
      <div className="app-shell">
        <AdminScreen
          showTopBar
          onBack={() => {
            setShowAdmins(false)
            setMobileView('dashboard')
          }}
        />
        {shellDialogs}
      </div>
    )
  }

  if (connected && mobileView === 'dashboard') {
    return (
      <div className="app-shell">
        <TopBar
          title="Dashboard"
          serverName={activeServer?.name}
          right={
            <>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowAdmins(true)
                  setMobileView('admins')
                }}
              >
                Admins
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void disconnect()}>
                Disconnect
              </Button>
            </>
          }
        />
        <DashboardScreen onOpenBucket={openBucket} />
        {shellDialogs}
      </div>
    )
  }

  return (
    <div className="app-shell">
      <TopBar
        title="Cloodsy S3"
        right={
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus size={14} />
            Add
          </Button>
        }
      />
      <div className="app-content">
        {servers.length === 0 ? (
          <EmptyState
            icon={Server}
            title="No servers"
            description="Add a Cloodsy S3 admin endpoint to get started."
            action={
              <Button onClick={() => setAddOpen(true)}>
                <Plus size={14} />
                Add Server
              </Button>
            }
          />
        ) : (
          <div className="page">
            <h1>Servers</h1>
            {servers.map((server) => (
              <button
                key={server.id}
                className="panel list-card"
                style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                onClick={() => void connectToServer(server, { resetView: true })}
                type="button"
                disabled={connectingId === server.id}
              >
                <div className="list-card__header">
                  <span
                    className={`nav-item__dot ${
                      connected && activeServer?.id === server.id ? 'is-online' : ''
                    }`}
                  />
                  <strong>{server.name}</strong>
                  <span className="spacer" />
                  {connectingId === server.id ? <div className="spinner" /> : null}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {server.url} · {server.username}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
      {shellDialogs}
    </div>
  )
}

function Welcome({
  onAdd,
  connectingId,
}: {
  onAdd: () => void
  connectingId: string | null
}) {
  const { servers } = useServers()
  return (
    <div className="app-content">
      <div className="page" style={{ height: '100%', justifyContent: 'center' }}>
        {servers.length === 0 ? (
          <EmptyState
            icon={Server}
            title="Welcome to Cloodsy S3"
            description="Add a server to manage buckets, credentials, lifecycle rules, and more."
            action={
              <Button onClick={onAdd}>
                <Plus size={14} />
                Add Server
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={Server}
            title={connectingId ? 'Connecting…' : 'Select a server'}
            description="Choose a server from the sidebar to connect."
          />
        )}
      </div>
    </div>
  )
}
