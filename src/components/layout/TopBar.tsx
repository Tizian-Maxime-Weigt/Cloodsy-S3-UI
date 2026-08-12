import { Menu, Monitor, Moon, Sun, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTheme } from '../../store/theme'

export function TopBar({
  serverName,
  title = 'Cloodsy S3',
  left,
  right,
  onMenu,
  menuOpen,
}: {
  serverName?: string | null
  title?: string
  left?: ReactNode
  right?: ReactNode
  onMenu?: () => void
  menuOpen?: boolean
}) {
  const theme = useTheme()
  const ThemeIcon = theme.mode === 'light' ? Sun : theme.mode === 'dark' ? Moon : Monitor

  return (
    <header className="topbar">
      {onMenu ? (
        <button
          className="btn-icon"
          type="button"
          onClick={onMenu}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      ) : null}
      {left}
      <div className="topbar__brand">{title}</div>
      {serverName ? <span className="topbar__badge">{serverName}</span> : null}
      <div className="topbar__spacer" />
      {right}
      <button
        className="btn-icon mobile-only"
        onClick={theme.cycle}
        type="button"
        title={`Theme: ${theme.label}`}
        aria-label={`Theme: ${theme.label}. Click to change.`}
      >
        <ThemeIcon size={18} />
      </button>
    </header>
  )
}
