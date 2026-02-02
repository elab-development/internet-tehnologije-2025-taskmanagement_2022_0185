import type { SelectHTMLAttributes } from 'react'

interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className'> {
  label?: string
  options: SelectOption[]
  error?: string
  className?: string
}

const BASE_SELECT_CLASSES =
  'w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:ring-2 focus:ring-slate-300'

export default function Select({ label, options, error, id, className, ...props }: SelectProps) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-')
  const classes = [
    BASE_SELECT_CLASSES,
    error ? 'border-red-300 focus:border-red-300 focus:ring-red-200' : 'border-slate-300 focus:border-slate-400',
    className
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="flex flex-col gap-1.5">
      {label ? (
        <label className="text-sm font-medium text-slate-700" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <select id={selectId} className={classes} {...props}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
