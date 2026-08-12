export function Switch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      className={`switch ${checked ? 'is-on' : ''}`}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="switch__thumb" />
    </button>
  )
}
