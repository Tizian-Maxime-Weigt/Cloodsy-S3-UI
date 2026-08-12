import {
  cloneElement,
  isValidElement,
  useId,
  type InputHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react'
import { Search, X } from 'lucide-react'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  const autoId = useId()
  const hintId = hint ? `${autoId}-hint` : undefined
  const childId =
    isValidElement(children) && typeof (children.props as { id?: string }).id === 'string'
      ? (children.props as { id?: string }).id
      : autoId

  const control = isValidElement(children)
    ? cloneElement(children as ReactElement<{ id?: string; 'aria-describedby'?: string }>, {
        id: childId,
        'aria-describedby': hintId,
      })
    : children

  return (
    <div className="field">
      <label htmlFor={childId}>{label}</label>
      {control}
      {hint ? (
        <div className="field-hint" id={hintId}>
          {hint}
        </div>
      ) : null}
    </div>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder = 'Search',
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}) {
  return (
    <div className={`search-field ${className}`.trim()}>
      <Search size={16} className="search-field__icon" aria-hidden />
      <input
        type="search"
        className="search-field__input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
      />
      {value ? (
        <button
          type="button"
          className="btn-icon search-field__clear"
          aria-label="Clear search"
          onClick={() => onChange('')}
        >
          <X size={14} />
        </button>
      ) : null}
    </div>
  )
}
