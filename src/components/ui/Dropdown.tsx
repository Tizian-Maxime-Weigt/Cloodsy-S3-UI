import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'

export function Dropdown({
  open,
  onClose,
  anchor,
  children,
}: {
  open: boolean
  onClose: () => void
  anchor: HTMLElement | null
  children: ReactNode
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)

  useLayoutEffect(() => {
    if (!open || !anchor) {
      setPos(null)
      return
    }

    const place = () => {
      const rect = anchor.getBoundingClientRect()
      const menu = menuRef.current
      const mw = menu?.offsetWidth ?? 180
      const mh = menu?.offsetHeight ?? 240
      const gap = 4
      const pad = 8

      let top = rect.bottom + gap
      if (top + mh > window.innerHeight - pad) {
        top = Math.max(pad, rect.top - gap - mh)
      }

      let left = rect.right - mw
      left = Math.min(Math.max(pad, left), window.innerWidth - mw - pad)
      setPos({ top, left })
    }

    place()
    const id = requestAnimationFrame(place)
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      cancelAnimationFrame(id)
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open, anchor])

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node
      if (menuRef.current?.contains(t) || anchor?.contains(t)) return
      onClose()
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose, anchor])

  if (!open) return null

  return createPortal(
    <div
      ref={menuRef}
      className="menu menu--portal"
      role="menu"
      style={
        pos
          ? { top: pos.top, left: pos.left }
          : { visibility: 'hidden', top: 0, left: 0 }
      }
    >
      {children}
    </div>,
    document.body,
  )
}
