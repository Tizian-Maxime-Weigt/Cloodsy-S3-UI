import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ThemeMode } from '../types'

const KEY = 'cloodsy_theme_mode'

interface ThemeStoreValue {
  mode: ThemeMode
  resolved: 'light' | 'dark'
  setMode: (mode: ThemeMode) => void
  cycle: () => void
  label: string
}

const ThemeStoreContext = createContext<ThemeStoreValue | null>(null)

function systemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function applyResolvedTheme(resolved: 'light' | 'dark') {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}

export function ThemeStoreProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(KEY) as ThemeMode | null
    return saved === 'light' || saved === 'dark' || saved === 'system'
      ? saved
      : 'system'
  })
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const resolved: 'light' | 'dark' =
    mode === 'system' ? (systemDark ? 'dark' : 'light') : mode

  useLayoutEffect(() => {
    applyResolvedTheme(resolved)
  }, [resolved])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    localStorage.setItem(KEY, m)
  }, [])

  const cycle = useCallback(() => {
    setMode(mode === 'light' ? 'dark' : mode === 'dark' ? 'system' : 'light')
  }, [mode, setMode])

  const label =
    mode === 'light' ? 'Light' : mode === 'dark' ? 'Dark' : 'System'

  const value = useMemo(
    () => ({ mode, resolved, setMode, cycle, label }),
    [cycle, label, mode, resolved, setMode],
  )

  return (
    <ThemeStoreContext.Provider value={value}>{children}</ThemeStoreContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeStoreContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeStoreProvider')
  return ctx
}
