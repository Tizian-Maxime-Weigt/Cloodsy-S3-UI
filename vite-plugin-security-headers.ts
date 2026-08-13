import type { Plugin } from 'vite'

/** Production-only CSP (dev needs Vite HMR / eval). */
const CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https: http:",
  "media-src 'self' blob: https: http:",
  // Admin/S3 endpoints are user-configured (any host).
  "connect-src 'self' https: http: ws: wss:",
  "worker-src 'self' blob:",
  "frame-src 'self' blob:",
].join('; ')

export function securityHeadersPlugin(): Plugin {
  return {
    name: 'cloodsy-security-headers',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        if (ctx.server) {
          return html.replace('<!--csp-->', '')
        }
        const tag = `<meta http-equiv="Content-Security-Policy" content="${CSP}" />`
        return html.replace('<!--csp-->', tag)
      },
    },
  }
}
