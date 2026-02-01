interface SpinnerProps {
  className?: string
  label?: string
}

const BASE_SPINNER_CLASSES = 'h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900'

export default function Spinner({ className, label = 'Loading...' }: SpinnerProps) {
  const spinnerClassName = [BASE_SPINNER_CLASSES, className].filter(Boolean).join(' ')

  return (
    <span className="inline-flex items-center gap-2" role="status" aria-live="polite">
      <span aria-hidden="true" className={spinnerClassName} />
      {label ? <span className="text-sm text-slate-600">{label}</span> : null}
    </span>
  )
}

