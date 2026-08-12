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

interface AuthStoreValue {
  api: ApiClient
  token: string | null
  username: string | null
  isLoggedIn: boolean
  isLoading: boolean
  error: string | null
  connectToServer: (server: ServerConnection) => Promise<boolean>
  disconnect: () => Promise<void>
  clearError: () => void
}

const AuthStoreContext = createContext<AuthStoreValue | null>(null)

export function AuthStoreProvider({ children }: { children: ReactNode }) {
  const servers = useServers()
  const apiRef = useRef(new ApiClient())
  const api = apiRef.current

  const [token, setTokenState] = useState<string | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [serverId, setServerId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const forceDisconnect = useCallback(() => {
    setTokenState(null)
    setUsername(null)
    api.token = null
    servers.setActiveServer(null)
  }, [api, servers])

  const doLogin = useCallback(
    async (user: string, password: string, sid: string | null) => {
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
        return true
      } catch (e) {
        if (e instanceof ApiException) setError(e.message)
        else setError(`Connection failed: ${e}`)
        return false
      }
    },
    [api, servers],
  )

  const handleUnauthorized = useCallback(() => {
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
    async (server: ServerConnection) => {
      setIsLoading(true)
      setError(null)
      setServerId(server.id)
      api.baseUrl = server.url

      const savedToken = servers.getToken(server.id)
      if (savedToken) {
        setTokenState(savedToken)
        api.token = savedToken
        try {
          await api.get('/status')
          setUsername(server.username)
          setIsLoading(false)
          servers.setActiveServer(server)
          return true
        } catch {
          setTokenState(null)
          api.token = null
        }
      }

      const password = servers.getPassword(server.id)
      if (password) {
        const success = await doLogin(server.username, password, server.id)
        setIsLoading(false)
        if (success) servers.setActiveServer(server)
        return success
      }

      setError('No saved credentials')
      setIsLoading(false)
      return false
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
