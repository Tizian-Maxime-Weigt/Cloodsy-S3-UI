import type { ServerConnection } from '../types'
import { assertHttpEndpointUrl } from '../lib/format'

const KEY_SERVERS = 'cloodsy_servers_list'
const KEY_ACTIVE = 'cloodsy_active_server'
const pwKey = (id: string) => `cloodsy_pw_${id}`
const tokenKey = (id: string) => `cloodsy_token_${id}`

/** Session-only passwords (never written unless persist=true). */
const memoryPasswords = new Map<string, string>()

function sanitizeServer(raw: unknown): ServerConnection | null {
  if (!raw || typeof raw !== 'object') return null
  const s = raw as Partial<ServerConnection>
  if (!s.id || !s.name || !s.url || !s.username) return null
  try {
    const url = assertHttpEndpointUrl(String(s.url), 'Admin URL')
    const s3Url =
      s.s3Url && String(s.s3Url).trim()
        ? assertHttpEndpointUrl(String(s.s3Url), 'S3 URL')
        : undefined
    return {
      id: String(s.id),
      name: String(s.name),
      url,
      s3Url,
      username: String(s.username),
    }
  } catch {
    return null
  }
}

export function loadServers(): ServerConnection[] {
  try {
    const raw = localStorage.getItem(KEY_SERVERS)
    if (!raw) return []
    const list = JSON.parse(raw) as unknown
    if (!Array.isArray(list)) return []
    return list.map(sanitizeServer).filter((s): s is ServerConnection => s != null)
  } catch {
    return []
  }
}

function persist(servers: ServerConnection[]) {
  localStorage.setItem(KEY_SERVERS, JSON.stringify(servers))
}

export function saveServers(servers: ServerConnection[]) {
  persist(servers)
}

export function getLastActiveServerId(): string | null {
  return localStorage.getItem(KEY_ACTIVE)
}

export function setLastActiveServerId(id: string | null) {
  if (id) localStorage.setItem(KEY_ACTIVE, id)
  else localStorage.removeItem(KEY_ACTIVE)
}

export function getPassword(serverId: string): string | null {
  return memoryPasswords.get(serverId) ?? localStorage.getItem(pwKey(serverId))
}

export function hasPersistedPassword(serverId: string): boolean {
  return localStorage.getItem(pwKey(serverId)) != null
}

export function setPassword(
  serverId: string,
  password: string,
  persistPassword: boolean,
) {
  memoryPasswords.set(serverId, password)
  if (persistPassword) localStorage.setItem(pwKey(serverId), password)
  else localStorage.removeItem(pwKey(serverId))
}

export function clearPersistedPassword(serverId: string) {
  localStorage.removeItem(pwKey(serverId))
}

export function clearPassword(serverId: string) {
  memoryPasswords.delete(serverId)
  localStorage.removeItem(pwKey(serverId))
}

export function getToken(serverId: string): string | null {
  return localStorage.getItem(tokenKey(serverId))
}

export function setToken(serverId: string, token: string) {
  localStorage.setItem(tokenKey(serverId), token)
}

export function clearToken(serverId: string) {
  localStorage.removeItem(tokenKey(serverId))
}

export function deleteServerSecrets(serverId: string) {
  clearPassword(serverId)
  clearToken(serverId)
  if (getLastActiveServerId() === serverId) setLastActiveServerId(null)
}
