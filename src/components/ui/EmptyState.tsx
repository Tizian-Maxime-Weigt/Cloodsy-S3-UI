import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon?: LucideIcon
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="empty-state">
      {Icon ? <Icon size={36} strokeWidth={1.5} /> : null}
      <div className="empty-state__title">{title}</div>
      {description ? <p>{description}</p> : null}
      {action}
    </div>
  )
}
