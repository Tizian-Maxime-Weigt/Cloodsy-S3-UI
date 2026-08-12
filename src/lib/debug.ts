type DebugLevel = 'debug' | 'info' | 'warn' | 'error'

const PREFIX = '[cloodsy]'

function consoleFn(level: DebugLevel) {
  if (level === 'error') return console.error
  if (level === 'warn') return console.warn
  if (level === 'info') return console.info
  return console.debug
}

function serialize(value: unknown): unknown {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    }
  }
  if (value instanceof Response) {
    return {
      status: value.status,
      statusText: value.statusText,
      url: value.url,
      type: value.type,
    }
  }
  return value
}

async function forwardToVite(
  level: DebugLevel,
  message: string,
  details?: unknown,
) {
  if (!import.meta.env.DEV) return
  try {
    await fetch('/__cloodsy_debug', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        level,
        message,
        details: details === undefined ? undefined : serialize(details),
        time: new Date().toISOString(),
      }),
      keepalive: true,
    })
  } catch {
    /* ignore — debug sink must never break app flow */
  }
}

export function debugLog(
  level: DebugLevel,
  message: string,
  details?: unknown,
) {
  // Never emit client logs or forward payloads in production builds.
  if (!import.meta.env.DEV) return
  const fn = consoleFn(level)
  if (details !== undefined) fn(PREFIX, message, details)
  else fn(PREFIX, message)
  void forwardToVite(level, message, details)
}

export function debugInfo(message: string, details?: unknown) {
  debugLog('info', message, details)
}

export function debugWarn(message: string, details?: unknown) {
  debugLog('warn', message, details)
}

export function debugError(message: string, details?: unknown) {
  debugLog('error', message, details)
}
