import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from 'react'

const ProgressContext = createContext<{ value: number; max: number; pct: number }>({
  value: 0,
  max: 100,
  pct: 0,
})

export function Progress({
  value,
  max = 100,
  children,
  className = '',
  size = 'md',
}: {
  value: number
  max?: number
  children?: ReactNode
  className?: string
  size?: 'sm' | 'md'
}) {
  const safeMax = max > 0 ? max : 100
  const pct = Math.min(100, Math.max(0, (value / safeMax) * 100))

  return (
    <ProgressContext.Provider value={{ value, max: safeMax, pct }}>
      <div
        className={`ui-progress ${size === 'sm' ? 'ui-progress--sm' : ''} ${className}`.trim()}
        data-slot="progress"
      >
        {children}
        <div
          className="ui-progress__track"
          data-slot="progress-track"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={safeMax}
          aria-valuenow={Math.min(value, safeMax)}
        >
          <div
            className="ui-progress__indicator"
            data-slot="progress-indicator"
            style={{ '--progress': `${pct}%` } as CSSProperties}
          />
        </div>
      </div>
    </ProgressContext.Provider>
  )
}

export function ProgressLabel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`ui-progress__label ${className}`.trim()} data-slot="progress-label">
      {children}
    </div>
  )
}

export function ProgressValue({
  children,
  className = '',
}: {
  children?: ReactNode | ((pct: number, value: number) => ReactNode)
  className?: string
}) {
  const { pct, value } = useContext(ProgressContext)
  const content =
    typeof children === 'function'
      ? children(pct, value)
      : (children ?? `${pct < 1 && value > 0 ? '<1' : Math.round(pct)}%`)

  return (
    <div className={`ui-progress__value ${className}`.trim()} data-slot="progress-value">
      {content}
    </div>
  )
}
