import { debugInfo, debugWarn } from '../lib/debug'
import {
  DEFAULT_LIVE_FOCUS,
  liveMessageType,
  parseLiveMessage,
  toAdminWebSocketUrl,
  type LiveFocus,
  type LiveMode,
} from '../lib/live'

export interface LiveClientDeps {
  getBaseUrl: () => string
  getToken: () => string | null
  getFocus: () => LiveFocus | null
  fetchStatus: () => Promise<void>
  fetchBuckets: () => Promise<void>
  fetchBucketDetail: (name: string) => Promise<void>
  fetchObjects: (name: string, prefix: string) => Promise<void>
  fetchCredentials: (name: string) => Promise<void>
  fetchLifecycleRules: (name: string) => Promise<void>
  fetchWebhooks: (name: string) => Promise<void>
  fetchAdmins: () => Promise<void>
  onMessage: (msg: Record<string, unknown>) => void
  onMode: (mode: LiveMode) => void
}

const WS_CONNECT_MS = 4000
const WS_HELLO_MS = 2500
const CLIENT_PING_MS = 25_000
const POLL_TICK_MS = 2_000
const HIDDEN_TICK_MS = 30_000

const POLL_MS = {
  status: 15_000,
  buckets: 8_000,
  detail: 5_000,
  objects: 10_000,
  extra: 10_000,
} as const

const LIVE_SAFETY_MS = {
  status: 60_000,
  buckets: 60_000,
  detail: 60_000,
  objects: 45_000,
  extra: 60_000,
} as const

/**
 * Prefers `/admin/ws` when the server speaks JSON events.
 * Current Cloodsy S3 builds have no WebSocket API, so the client falls
 * back to silent REST polling after a short probe.
 */
export class LiveClient {
  private readonly deps: LiveClientDeps
  private destroyed = false
  private visible = typeof document === 'undefined' ? true : !document.hidden
  private ws: WebSocket | null = null
  private wsUnsupported = false
  private sawUsefulMessage = false
  private mode: LiveMode = 'idle'
  private focus: LiveFocus = DEFAULT_LIVE_FOCUS
  private pollTimer: ReturnType<typeof setTimeout> | null = null
  private helloTimer: ReturnType<typeof setTimeout> | null = null
  private connectTimer: ReturnType<typeof setTimeout> | null = null
  private pingTimer: ReturnType<typeof setInterval> | null = null
  private last = { status: 0, buckets: 0, detail: 0, objects: 0, extra: 0 }
  private ticking = false

  constructor(deps: LiveClientDeps) {
    this.deps = deps
  }

  start() {
    this.destroyed = false
    this.focus = this.deps.getFocus() ?? DEFAULT_LIVE_FOCUS
    this.visible = !document.hidden
    document.addEventListener('visibilitychange', this.onVisibility)
    this.connectWs()
    this.schedule(POLL_MS.buckets)
  }

  stop() {
    this.destroyed = true
    document.removeEventListener('visibilitychange', this.onVisibility)
    this.teardownSocket()
    this.clearPoll()
    this.setMode('idle')
  }

  setFocus(focus: LiveFocus | null) {
    this.focus = focus ?? DEFAULT_LIVE_FOCUS
    this.sendSubscribe()
  }

  private onVisibility = () => {
    this.visible = !document.hidden
    if (this.visible) this.schedule(0)
  }

  private setMode(mode: LiveMode) {
    if (this.mode === mode) return
    this.mode = mode
    this.deps.onMode(mode)
  }

  private connectWs() {
    if (this.destroyed || this.wsUnsupported) {
      if (!this.destroyed) this.setMode('poll')
      return
    }

    const base = this.deps.getBaseUrl().replace(/\/$/, '')
    const token = this.deps.getToken()
    if (!base || !token) {
      this.setMode('poll')
      return
    }

    this.setMode('connecting')
    let wsUrl: string
    try {
      const url = new URL(toAdminWebSocketUrl(base))
      url.searchParams.set('token', token)
      wsUrl = url.toString()
    } catch (e) {
      debugWarn('Live WS URL invalid', e)
      this.wsUnsupported = true
      this.setMode('poll')
      return
    }

    let socket: WebSocket
    try {
      socket = new WebSocket(wsUrl)
    } catch (e) {
      debugWarn('Live WS construct failed', e)
      this.wsUnsupported = true
      this.setMode('poll')
      return
    }

    this.ws = socket
    this.sawUsefulMessage = false

    this.connectTimer = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        debugInfo('Live WS probe timed out — using poll')
        this.wsUnsupported = true
        socket.close()
      }
    }, WS_CONNECT_MS)

    socket.onopen = () => {
      this.clearTimer('connect')
      if (this.destroyed || this.ws !== socket) return
      debugInfo('Live WS open, waiting for hello')
      this.safeSend({ type: 'auth', token })
      this.sendSubscribe()
      this.safeSend({ type: 'sync' })
      this.helloTimer = setTimeout(() => {
        if (this.sawUsefulMessage || this.destroyed) return
        debugInfo('Live WS had no JSON hello — using poll')
        this.wsUnsupported = true
        socket.close()
      }, WS_HELLO_MS)
    }

    socket.onmessage = (event) => {
      if (this.destroyed || this.ws !== socket) return
      if (typeof event.data !== 'string') return
      const msg = parseLiveMessage(event.data)
      if (!msg) return
      this.sawUsefulMessage = true
      this.clearTimer('hello')
      this.setMode('live')
      const type = liveMessageType(msg)
      if (type === 'ping') {
        this.safeSend({ type: 'pong' })
        return
      }
      if (type === 'pong' || type === 'hello' || type === 'ack') return
      this.deps.onMessage(msg)
    }

    socket.onerror = () => {
      /* onclose handles fallback */
    }

    socket.onclose = () => {
      this.clearTimer('connect')
      this.clearTimer('hello')
      this.clearPing()
      if (this.ws === socket) this.ws = null
      if (this.destroyed) return
      if (!this.sawUsefulMessage) {
        this.wsUnsupported = true
        this.setMode('poll')
        return
      }
      this.setMode('poll')
    }
  }

  private sendSubscribe() {
    const channels = ['status', 'buckets']
    if (this.focus.bucket) channels.push(`bucket:${this.focus.bucket}`)
    this.safeSend({ type: 'subscribe', channels, focus: this.focus })
  }

  private safeSend(body: Record<string, unknown>) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return
    try {
      this.ws.send(JSON.stringify(body))
    } catch {
      /* ignore */
    }
  }

  private teardownSocket() {
    this.clearTimer('connect')
    this.clearTimer('hello')
    this.clearPing()
    const socket = this.ws
    this.ws = null
    if (!socket) return
    socket.onopen = null
    socket.onmessage = null
    socket.onerror = null
    socket.onclose = null
    try {
      socket.close()
    } catch {
      /* ignore */
    }
  }

  private startPing() {
    this.clearPing()
    this.pingTimer = setInterval(() => {
      this.safeSend({ type: 'ping' })
    }, CLIENT_PING_MS)
  }

  private clearPing() {
    if (this.pingTimer != null) {
      clearInterval(this.pingTimer)
      this.pingTimer = null
    }
  }

  private schedule(delay = POLL_TICK_MS) {
    this.clearPoll()
    if (this.destroyed) return
    const wait = this.visible ? delay : HIDDEN_TICK_MS
    this.pollTimer = setTimeout(() => void this.tick(), wait)
  }

  private clearPoll() {
    if (this.pollTimer != null) {
      clearTimeout(this.pollTimer)
      this.pollTimer = null
    }
  }

  private clearTimer(which: 'connect' | 'hello') {
    if (which === 'connect' && this.connectTimer != null) {
      clearTimeout(this.connectTimer)
      this.connectTimer = null
    }
    if (which === 'hello' && this.helloTimer != null) {
      clearTimeout(this.helloTimer)
      this.helloTimer = null
    }
  }

  private async tick() {
    if (this.destroyed) return
    if (this.ticking) {
      this.schedule()
      return
    }
    if (this.mode === 'live' && !this.pingTimer) this.startPing()

    this.ticking = true
    try {
      if (!this.visible) return
      this.focus = this.deps.getFocus() ?? this.focus
      const now = Date.now()
      const live = this.mode === 'live'
      const every = live ? LIVE_SAFETY_MS : POLL_MS

      if (now - this.last.status >= every.status) {
        this.last.status = now
        await this.deps.fetchStatus()
      }
      if (this.destroyed) return
      if (now - this.last.buckets >= every.buckets) {
        this.last.buckets = now
        await this.deps.fetchBuckets()
      }
      if (this.destroyed) return

      const bucket = this.focus.bucket
      if (this.focus.screen === 'bucket' && bucket) {
        if (now - this.last.detail >= every.detail) {
          this.last.detail = now
          await this.deps.fetchBucketDetail(bucket)
        }
        if (this.destroyed) return
        const tab = this.focus.tab
        if (tab === 'files' && now - this.last.objects >= every.objects) {
          this.last.objects = now
          await this.deps.fetchObjects(bucket, this.focus.prefix ?? '')
        } else if (
          tab === 'credentials' &&
          now - this.last.extra >= every.extra
        ) {
          this.last.extra = now
          await this.deps.fetchCredentials(bucket)
        } else if (
          tab === 'lifecycle' &&
          now - this.last.extra >= every.extra
        ) {
          this.last.extra = now
          await this.deps.fetchLifecycleRules(bucket)
        } else if (tab === 'webhooks' && now - this.last.extra >= every.extra) {
          this.last.extra = now
          await this.deps.fetchWebhooks(bucket)
        }
      } else if (
        this.focus.screen === 'admins' &&
        now - this.last.extra >= every.extra
      ) {
        this.last.extra = now
        await this.deps.fetchAdmins()
      }
    } catch (e) {
      debugWarn('Live poll tick failed', e)
    } finally {
      this.ticking = false
      if (!this.destroyed) this.schedule()
    }
  }
}
