import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { ApiClient, ApiException } from '../api/client'
import type { ServerConnection } from '../types'
import { useServers } from './ServerStore'

export type ConnectResult =
  | { ok: true }
  | { ok: false; error: string; needsPassword?: boolean }

interface AuthStoreValue {
  api: ApiClient
  token: string | null
  username: string | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  connectToServer: (
    server: ServerConnection,
    opts?: { password?: string; rememberPassword?: boolean },
  ) => Promise<ConnectResult>
  disconnect: () => Promise<void>
  clearError: () => void
}

const AuthStoreContext = createContext<AuthStoreValue | null>(null)

function failMessage(e: unknown): string {
  if (e instanceof ApiException) return e.message
  return `Connection failed: ${e}`
}

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const servers = useServers()
  const apiRef = useRef(new ApiClient())
  const api = apiRef.current

  const [token, setTokenState] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [serverId, setServerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const probingRef = useRef(false)

  const forceDisconnect = useCallback(() => {
    setTokenState(null)
    setUsername(null)
    api.token = null
    servers.setActiveServer(null)
  }, [api, servers])

  const doLogin = useCallback(
    async (user: string, password: string, sid: string | null): Promise<ConnectResult> => {
      try {
        const response = await api.post('/login', {
          username: user,
          password,
        })
        const newToken = String(response.token ?? '')
        const newUser = String(response.username ?? user)
        setTokenState(newToken)
        setUsername(newUser)
        api.token = newToken
        if (sid) servers.saveToken(sid, newToken)
        return { ok: true }
      } catch (e) {
        const message = failMessage(e)
        setError(message)
        return { ok: false, error: message }
      }
    },
    [api, servers],
  )

  const handleUnauthorized = useCallback(() => {
    if (probingRef.current) return
    if (serverId && username) {
      const pw = servers.getPassword(serverId)
      if (pw) {
        void doLogin(username, pw, serverId)
        return
      }
    }
    forceDisconnect()
  }, [doLogin, forceDisconnect, serverId, servers, username])

  api.onUnauthorized = handleUnauthorized

  const connectToServer = useCallback(
    async (
      server: ServerConnection,
      opts?: { password?: string; rememberPassword?: boolean },
    ): Promise<ConnectResult> => {
      setIsLoading(true)
      setError(null)
      setServerId(server.id)
      api.baseUrl = server.url

      if (opts?.password) {
        servers.setPassword(server.id, opts.password, opts.rememberPassword ?? false)
      }

      const savedToken = servers.getToken(server.id)
      if (savedToken && !opts?.password) {
        setTokenState(savedToken)
        api.token = savedToken
        probingRef.current = true
        try {
          await api.get('/status')
          setUsername(server.username)
          setIsLoading(false)
          servers.setActiveServer(server)
          return { ok: true }
        } catch {
          setTokenState(null)
          api.token = null
          servers.clearToken(server.id)
        } finally {
          probingRef.current = false
        }
      }

      const password = opts?.password || servers.getPassword(server.id)
      if (password) {
        const result = await doLogin(server.username, password, server.id)
        setIsLoading(false)
        if (result.ok) servers.setActiveServer(server)
        return result
      }

      const message = 'Enter the admin password to connect'
      setError(message)
      setIsLoading(false)
      return { ok: false, error: message, needsPassword: true }
    },
    [api, doLogin, servers],
  )

  const disconnect = useCallback(async () => {
    if (token) {
      try {
        await api.post('/logout')
      } catch {
        /* ignore */
      }
    }
    if (serverId) servers.clearToken(serverId)
    setTokenState(null)
    setUsername(null)
    setServerId(null)
    api.token = null
    api.baseUrl = ''
    servers.setActiveServer(null)
  }, [api, serverId, servers, token])

  const value = useMemo<AuthStoreValue>(
    () => ({
      api,
      token,
      username,
      isLoggedIn: token != null,
      isLoading,
      error,
      connectToServer,
      disconnect,
      clearError: () => setError(null),
    }),
    [api, connectToServer, disconnect, error, isLoading, token, username],
  )

  return <AuthStoreContext.Provider value={value}>{children}</AuthStoreContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthStoreContext)
  if (!ctx) throw new Error('useAuth must be used within AuthStoreProvider')
  return ctx
}
