import { debugError, debugInfo } from '../lib/debug'

export class ApiException extends Error {
  statusCode: number

  constructor(statusCode: number, message: string) {
    super(message)
    this.name = 'ApiException'
    this.statusCode = statusCode
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401
  }
}

type JsonMap = Record<string, unknown>

export class ApiClient {
  baseUrl = ''
  token: string | null = null
  onUnauthorized: (() => void) | null = null

  private headers(): HeadersInit {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
    }
    if (this.token) h.Authorization = `Bearer ${this.token}`
    return h
  }

  private uri(path: string): string {
    const base = this.baseUrl.replace(/\/$/, '')
    return `${base}/admin${path}`
  }

  private async handleResponse(
    method: string,
    path: string,
    response: Response,
  ): Promise<JsonMap> {
    let body: JsonMap = {}
    try {
      body = (await response.json()) as JsonMap
    } catch {
      body = {}
    }

    if (response.status >= 200 && response.status < 300) {
      if (method !== 'GET') {
        debugInfo(`Admin ${method} ${path} ✓`, { status: response.status })
      }
      return body
    }
    if (response.status === 401) {
      this.onUnauthorized?.()
    }
    const message = (body.error as string) || 'Unknown error'
    debugError(`Admin ${method} ${path} failed`, {
      status: response.status,
      message,
      body,
    })
    throw new ApiException(response.status, message)
  }

  private async request(
    method: string,
    path: string,
    body?: JsonMap,
  ): Promise<JsonMap> {
    const url = this.uri(path)
    if (method !== 'GET') {
      debugInfo(`Admin ${method} ${path} →`, { url })
    }
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 10_000)
      const response = await fetch(url, {
        method,
        headers: this.headers(),
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })
      clearTimeout(timer)
      return await this.handleResponse(method, path, response)
    } catch (e) {
      if (e instanceof ApiException) throw e
      debugError(`Admin ${method} ${path} network/client error`, {
        url,
        error: String(e),
      })
      throw new ApiException(0, `Connection failed: ${e}`)
    }
  }

  get(path: string): Promise<JsonMap> {
    return this.request('GET', path)
  }

  post(path: string, body: JsonMap = {}): Promise<JsonMap> {
    return this.request('POST', path, body)
  }

  put(path: string, body: JsonMap = {}): Promise<JsonMap> {
    return this.request('PUT', path, body)
  }

  delete(path: string): Promise<JsonMap> {
    return this.request('DELETE', path)
  }
}
