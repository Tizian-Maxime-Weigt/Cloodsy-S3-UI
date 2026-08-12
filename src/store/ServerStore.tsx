import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ServerConnection } from '../types'
import { generateId } from '../lib/format'
import {
  clearPersistedPassword,
  clearToken as clearTokenStorage,
  deleteServerSecrets,
  getLastActiveServerId,
  getPassword as getPasswordStorage,
  getToken as getTokenStorage,
  hasPersistedPassword as hasPersistedPasswordStorage,
  loadServers,
  saveServers,
  setLastActiveServerId,
  setPassword as setPasswordStorage,
  setToken as setTokenStorage,
} from './servers'

interface ServerStoreValue {
  servers: ServerConnection[]
  activeServer: ServerConnection | null
  setActiveServer: (server: ServerConnection | null) => void
  addServer: (
    data: Omit<ServerConnection, 'id'>,
    password: string,
    persistPassword?: boolean,
  ) => ServerConnection
  updateServer: (
    server: ServerConnection,
    opts?: { password?: string | null; persistPassword?: boolean },
  ) => void
  deleteServer: (id: string) => void
  getPassword: (id: string) => string | null
  hasPersistedPassword: (id: string) => boolean
  setPassword: (id: string, password: string, persist: boolean) => void
  getToken: (id: string) => string | null
  saveToken: (id: string, token: string) => void
  clearToken: (id: string) => void
  getLastActiveServerId: () => string | null
}

const ServerStoreContext = createContext<ServerStoreValue | null>(null)

export function ServerStoreProvider({ children }: { children: ReactNode }) {
  const [servers, setServers] = useState<ServerConnection[]>(() => loadServers())
  const [activeServer, setActiveServerState] = useState<ServerConnection | null>(null)

  const setActiveServer = useCallback((server: ServerConnection | null) => {
    setActiveServerState(server)
    setLastActiveServerId(server?.id ?? null)
  }, [])

  const addServer = useCallback(
    (
      data: Omit<ServerConnection, 'id'>,
      password: string,
      persistPassword = false,
    ) => {
      const server: ServerConnection = { ...data, id: generateId() }
      setServers((prev) => {
        const next = [...prev, server]
        saveServers(next)
        return next
      })
      setPasswordStorage(server.id, password, persistPassword)
      return server
    },
    [],
  )

  const updateServer = useCallback(
    (
      server: ServerConnection,
      opts?: { password?: string | null; persistPassword?: boolean },
    ) => {
      setServers((prev) => {
        const next = prev.map((s) => (s.id === server.id ? server : s))
        saveServers(next)
        return next
      })
      if (opts?.password) {
        setPasswordStorage(
          server.id,
          opts.password,
          opts.persistPassword ?? false,
        )
      } else if (opts?.persistPassword === false) {
        clearPersistedPassword(server.id)
      }
      setActiveServerState((active) => (active?.id === server.id ? server : active))
    },
    [],
  )

  const deleteServer = useCallback((id: string) => {
    setServers((prev) => {
      const next = prev.filter((s) => s.id !== id)
      saveServers(next)
      return next
    })
    deleteServerSecrets(id)
    setActiveServerState((active) => {
      if (active?.id === id) {
        setLastActiveServerId(null)
        return null
      }
      return active
    })
  }, [])

  const value = useMemo<ServerStoreValue>(
    () => ({
      servers,
      activeServer,
      setActiveServer,
      addServer,
      updateServer,
      deleteServer,
      getPassword: getPasswordStorage,
      hasPersistedPassword: hasPersistedPasswordStorage,
      setPassword: setPasswordStorage,
      getToken: getTokenStorage,
      saveToken: setTokenStorage,
      clearToken: clearTokenStorage,
      getLastActiveServerId,
    }),
    [activeServer, addServer, deleteServer, servers, setActiveServer, updateServer],
  )

  return (
    <ServerStoreContext.Provider value={value}>{children}</ServerStoreContext.Provider>
  )
}

export function useServers() {
  const ctx = useContext(ServerStoreContext)
  if (!ctx) throw new Error('useServers must be used within ServerStoreProvider')
  return ctx
}
