import { HardDrive, Activity, Box, Database } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export function StatCard({
  label,
  value,
  meta,
  icon: Icon,
}: {
  label: string
  value: string
  meta?: string
  icon?: LucideIcon
}) {
  const prev = useRef(value)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (prev.current === value) return
    prev.current = value
    setFlash(true)
    const id = window.setTimeout(() => setFlash(false), 700)
    return () => window.clearTimeout(id)
  }, [value])

  return (
    <div className={`panel stat-card${flash ? ' stat-card--flash' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {Icon ? <Icon size={16} color="var(--muted)" /> : null}
        <div className="stat-card__label">{label}</div>
      </div>
      <div className="stat-card__value">{value}</div>
      {meta ? <div className="stat-card__meta">{meta}</div> : null}
    </div>
  )
}

export const StatIcons = { HardDrive, Activity, Box, Database }
