import { forwardRef, useId } from 'react'
import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string
  error?: string
  className?: string
}

const BASE_INPUT_CLASSES =
  'w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 focus:ring-slate-300'

const FIELD_WRAPPER_CLASSES = 'flex flex-col gap-1.5'

const LABEL_CLASSES = 'text-sm font-medium text-slate-700'

export default forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, id, className, ...inputProps },
  ref
) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  const errorId = `${inputId}-error`
  const inputClassName = [
    BASE_INPUT_CLASSES,
    error ? 'border-red-300 focus:border-red-300 focus:ring-red-200' : 'border-slate-300 focus:border-slate-400',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={FIELD_WRAPPER_CLASSES}>
      <label className={LABEL_CLASSES} htmlFor={inputId}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className={inputClassName}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-sm text-red-600">
          {error}
        </p>
      ) : null}
    </div>
  )
})

