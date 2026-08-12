import { Monitor, Moon, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTheme } from '../../store/theme'
import { LiveBadge } from '../ui/LiveBadge'

export function TopBar({
  serverName,
  title = 'Cloodsy S3',
  left,
  right,
}: {
  serverName?: string | null
  title?: string
  left?: ReactNode
  right?: ReactNode
}) {
  const theme = useTheme()
  const ThemeIcon = theme.mode === 'light' ? Sun : theme.mode === 'dark' ? Moon : Monitor

  return (
    <header className="topbar">
      {left}
      <div className="topbar__brand">{title}</div>
      {serverName ? <span className="topbar__badge">{serverName}</span> : null}
      <LiveBadge />
      <div className="topbar__spacer" />
      {right}
      <button className="btn-icon mobile-only" onClick={theme.cycle} title="Toggle theme">
        <ThemeIcon size={18} />
      </button>
    </header>
  )
}
