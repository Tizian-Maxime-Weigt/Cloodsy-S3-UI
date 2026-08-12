import type { Plugin } from 'vite'

type DebugPayload = {
  level?: 'debug' | 'info' | 'warn' | 'error'
  message?: string
  details?: unknown
  time?: string
}

function paint(level: string, text: string) {
  const reset = '\x1b[0m'
  const colors: Record<string, string> = {
    debug: '\x1b[90m',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
  }
  return `${colors[level] ?? ''}${text}${reset}`
}

export function cloodsyDebugPlugin(): Plugin {
  return {
    name: 'cloodsy-debug',
    configureServer(server) {
      server.middlewares.use('/__cloodsy_debug', (req, res, next) => {
        if (req.method !== 'POST') {
          next()
          return
        }

        const chunks: Buffer[] = []
        req.on('data', (chunk: Buffer) => chunks.push(chunk))
        req.on('end', () => {
          try {
            const raw = Buffer.concat(chunks).toString('utf8')
            const payload = JSON.parse(raw || '{}') as DebugPayload
            const level = payload.level ?? 'info'
            const time = payload.time
              ? new Date(payload.time).toLocaleTimeString()
              : new Date().toLocaleTimeString()
            const message = payload.message ?? '(no message)'
            const line = paint(
              level,
              `[cloodsy ${level}] ${time} ${message}`,
            )
            if (payload.details !== undefined) {
              console.log(line, payload.details)
            } else {
              console.log(line)
            }
          } catch (e) {
            console.log(paint('warn', '[cloodsy debug] bad payload'), e)
          }
          res.statusCode = 204
          res.end()
        })
      })
    },
  }
}
